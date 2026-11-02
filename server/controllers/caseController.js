import mongoose from 'mongoose';
import { z } from 'zod';
import Case from '../models/Case.js';
import { generateMystery } from '../services/mysteryService.js';
import { caseRecordData, publicCase } from '../services/gameRules.js';

export const createSchema = z.object({ premise: z.string().trim().min(20).max(500), difficulty: z.enum(['easy', 'medium', 'hard']) }).strict();
export const accuseSchema = z.object({ suspectId: z.string().min(1).max(80) }).strict();
const idOk = id => mongoose.isValidObjectId(id);
const fail = (status, message) => Object.assign(new Error(message), { status });

export async function createCase(req, res) {
  const input = createSchema.parse(req.body), mystery = await generateMystery(input.premise, input.difficulty);
  const created = await Case.create(caseRecordData(input, mystery));
  res.status(201).json({ case: publicCase(created) });
}
export async function getCase(req, res) {
  if (!idOk(req.params.id)) throw fail(404, 'Case not found.');
  const c = await Case.findById(req.params.id); if (!c) throw fail(404, 'Case not found.');
  res.json({ case: publicCase(c) });
}
export async function discoverClue(req, res) {
  if (!idOk(req.params.id)) throw fail(404, 'Case not found.');
  const c = await Case.findOneAndUpdate({ _id: req.params.id, accusationStatus: 'pending', clues: { $elemMatch: { id: req.params.clueId, discovered: false } } }, { $set: { 'clues.$.discovered': true } }, { new: true });
  if (c) return res.json({ case: publicCase(c), newlyDiscovered: true });
  const current = await Case.findById(req.params.id); if (!current) throw fail(404, 'Case not found.');
  if (current.accusationStatus !== 'pending') throw fail(409, 'This case is already closed.');
  if (!current.clues.some(x => x.id === req.params.clueId)) throw fail(404, 'Clue not found.');
  res.json({ case: publicCase(current), newlyDiscovered: false });
}
export async function requestHint(req, res) {
  if (!idOk(req.params.id)) throw fail(404, 'Case not found.');
  const c = await Case.findOneAndUpdate({ _id: req.params.id, accusationStatus: 'pending', $expr: { $lt: ['$hintsUsed', '$maxHints'] } }, [{ $set: { hints: { $map: { input: { $range: [0, { $size: '$hints' }] }, as: 'i', in: { $mergeObjects: [{ $arrayElemAt: ['$hints', '$$i'] }, { used: { $cond: [{ $eq: ['$$i', '$hintsUsed'] }, true, { $arrayElemAt: ['$hints.used', '$$i'] }] } }] } } }, hintsUsed: { $add: ['$hintsUsed', 1] } } }], { new: true }).select('+hints');
  if (!c) {
    const current = await Case.findById(req.params.id); if (!current) throw fail(404, 'Case not found.');
    if (current.accusationStatus !== 'pending') throw fail(409, 'This case is already closed.');
    throw fail(409, 'You have used all available hints.');
  }
  const hint = c.hints[c.hintsUsed - 1]?.text;
  if (!hint) throw fail(500, 'The next hint is unavailable.');
  res.json({ hint, hintsUsed: c.hintsUsed, maxHints: c.maxHints, scorePenalty: c.hintsUsed * 10 });
}
export async function accuse(req, res) {
  if (!idOk(req.params.id)) throw fail(404, 'Case not found.');
  const { suspectId } = accuseSchema.parse(req.body);
  const c = await Case.findById(req.params.id).select('+culpritId +solution +accusationId +hints'); if (!c) throw fail(404, 'Case not found.');
  if (c.accusationStatus !== 'pending') throw fail(409, 'An accusation has already been submitted.');
  if (!c.suspects.some(s => s.id === suspectId)) throw fail(400, 'Choose a suspect in this case.');
  const correct = suspectId === c.culpritId, cluesFound = c.clues.filter(clue => clue.discovered).length;
  const updated = await Case.findOneAndUpdate({ _id: c._id, accusationStatus: 'pending' }, [{ $set: { accusationId: { $literal: suspectId }, accusationStatus: 'submitted', correct: { $eq: [{ $literal: suspectId }, '$culpritId'] }, finalScore: { $cond: [{ $eq: [{ $literal: suspectId }, '$culpritId'] }, { $max: [0, { $subtract: [{ $add: ['$baseScore', { $multiply: [{ $size: { $filter: { input: '$clues', as: 'clue', cond: '$$clue.discovered' } } }, 5] }] }, { $multiply: ['$hintsUsed', 10] }] }] }, 0] } } }], { new: true });
  if (!updated) throw fail(409, 'An accusation has already been submitted.');
  res.json({ correct, finalScore: updated.finalScore, caseId: updated._id });
}
export async function getResult(req, res) {
  if (!idOk(req.params.id)) throw fail(404, 'Case not found.');
  const c = await Case.findById(req.params.id).select('+culpritId +solution +hints +accusationId'); if (!c) throw fail(404, 'Case not found.');
  if (c.accusationStatus !== 'submitted') throw fail(403, 'Submit your accusation to see the result.');
  const culprit = c.suspects.find(s => s.id === c.culpritId);
  res.json({ result: { correct: c.correct, culprit, solution: c.solution, finalScore: c.finalScore, baseScore: c.baseScore, discoveredClues: c.clues.filter(x => x.discovered), totalClues: c.clues.length, hintsUsed: c.hintsUsed, usedHints: c.hints.filter(h => h.used).map(h => h.text), difficulty: c.difficulty } });
}
