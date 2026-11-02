import test from 'node:test';
import assert from 'node:assert/strict';
import { counts, MAX_ATTEMPTS, generateMystery, validateMystery } from './mysteryService.js';
import { caseRecordData, publicCase, scoreCase } from './gameRules.js';
import caseRoutes from '../routes/caseRoutes.js';
import { createSchema, accuseSchema } from '../controllers/caseController.js';
import Case from '../models/Case.js';

function payload(difficulty) {
  const spec = counts[difficulty];
  const suspects = Array.from({ length: spec.suspects }, (_, i) => ({ id: `suspect-${i + 1}`, name: `Suspect ${i + 1}`, description: 'A person with a convincing account of the evening.' }));
  const clues = Array.from({ length: spec.clues }, (_, i) => ({ id: `clue-${i + 1}`, description: 'A carefully recorded detail from the scene.' }));
  return { title: 'The Midnight Ledger', story: 'A long enough story to establish the location, the people involved, and the unusual incident that needs to be investigated.', suspects, clues, culpritId: suspects[0].id, solution: 'The culprit changed the ledger after the clock stopped, which is shown by the ink and the time recorded in the final clue.', hints: Array.from({ length: spec.hints }, (_, i) => `Consider the timing of the evidence, stage ${i + 1}.`) };
}

for (const difficulty of Object.keys(counts)) {
  test(`${difficulty} mystery enforces exact suspect, clue, and hint counts`, () => {
    const result = validateMystery(JSON.stringify(payload(difficulty)), difficulty);
    assert.equal(result.suspects.length, counts[difficulty].suspects);
    assert.equal(result.clues.length, counts[difficulty].clues);
    assert.equal(result.hints.length, counts[difficulty].hints);
    assert.equal(result.baseScore, counts[difficulty].score);
  });
}

test('JSON extraction accepts fenced JSON with surrounding prose', () => {
  const data = payload('easy');
  assert.equal(validateMystery(`Generated case:\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\``, 'easy').title, data.title);
});

test('Gemini generation uses JSON schema and retries malformed output a limited number of times', async () => {
  const valid = JSON.stringify(payload('easy'));
  const responses = ['Here is the case, but no object', valid];
  const requests = [];
  const client = { models: { generateContent: async request => { requests.push(request); return { text: responses.shift() }; } } };
  const result = await generateMystery('A sufficiently detailed test premise.', 'easy', client);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].config.responseMimeType, 'application/json');
  assert.equal(requests[0].config.responseJsonSchema.properties.suspects.minItems, 3);
  assert.equal(requests[0].config.responseJsonSchema.properties.clues.maxItems, 5);
  assert.equal(result.suspects.length, 3);
  assert.equal(result.clues.length, 5);
  assert.match(requests[1].contents, /Correction required/);
});

test('Gemini generation stops after the configured maximum validation attempts', async () => {
  let calls = 0;
  const client = { models: { generateContent: async () => { calls += 1; return { text: 'no JSON response' }; } } };
  await assert.rejects(generateMystery('A sufficiently detailed test premise.', 'easy', client), /did not match the mystery schema/);
  assert.equal(calls, MAX_ATTEMPTS);
});

test('Gemini generation retries transient provider 5xx responses but preserves schema validation', async () => {
  let calls = 0;
  const client = { models: { generateContent: async () => {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error('temporary provider error'), { status: 503 });
    return { text: JSON.stringify(payload('easy')) };
  } } };
  const result = await generateMystery('A sufficiently detailed test premise.', 'easy', client);
  assert.equal(calls, 2);
  assert.equal(result.suspects.length, 3);
});

test('invalid counts, culprit IDs, duplicate IDs, and malformed JSON are rejected', () => {
  const wrongCount = payload('easy'); wrongCount.clues.pop();
  assert.throws(() => validateMystery(JSON.stringify(wrongCount), 'easy'));
  const missingField = payload('easy'); delete missingField.solution;
  assert.throws(() => validateMystery(JSON.stringify(missingField), 'easy'));
  const invalidCulprit = payload('easy'); invalidCulprit.culpritId = 'nobody';
  assert.throws(() => validateMystery(JSON.stringify(invalidCulprit), 'easy'));
  const duplicate = payload('easy'); duplicate.clues[0].id = duplicate.suspects[0].id;
  assert.throws(() => validateMystery(JSON.stringify(duplicate), 'easy'));
  assert.throws(() => validateMystery('{"title":', 'easy'));
});

test('public case hides undiscovered clue text and private game fields', () => {
  const safe = publicCase({ _id: 'case-id', premise: 'A long premise', title: 'Title', story: 'Story', difficulty: 'easy', suspects: [], clues: [{ id: 'a', description: 'Secret clue', discovered: false }, { id: 'b', description: 'Found clue', discovered: true }], culpritId: 'secret', solution: 'secret', hints: ['secret'], hintsUsed: 0, maxHints: 2, baseScore: 100, accusationStatus: 'pending', createdAt: new Date() });
  assert.deepEqual(safe.clues[0], { id: 'a', discovered: false });
  assert.equal(safe.clues[1].description, 'Found clue');
  for (const privateKey of ['culpritId', 'solution', 'hints', 'accusationId']) assert.equal(privateKey in safe, false);
});

test('generated string hints are converted to the Mongoose hint subdocument shape', () => {
  const generated = payload('easy');
  const record = caseRecordData({ premise: 'A sufficiently detailed test premise.', difficulty: 'easy' }, { ...generated, maxHints: 2, baseScore: 100 });
  assert.deepEqual(record.hints, generated.hints.map(text => ({ text, used: false })));
  assert.equal(record.clues.every(clue => clue.discovered === false), true);
  assert.equal(new Case(record).validateSync(), undefined);
});

test('scoring awards clue points, subtracts hints, floors at zero, and zeros wrong accusations', () => {
  assert.equal(scoreCase({ correct: true, baseScore: 150, cluesFound: 7, hintsUsed: 2 }), 165);
  assert.equal(scoreCase({ correct: true, baseScore: 100, cluesFound: 0, hintsUsed: 12 }), 0);
  assert.equal(scoreCase({ correct: false, baseScore: 200, cluesFound: 9, hintsUsed: 0 }), 0);
});

test('all six required API routes are registered with the expected methods', () => {
  const routes = caseRoutes.stack.filter(layer => layer.route).flatMap(layer => Object.keys(layer.route.methods).map(method => `${method.toUpperCase()} ${layer.route.path}`));
  for (const route of [
    'POST /',
    'GET /:id',
    'POST /:id/clues/:clueId/discover',
    'POST /:id/hints',
    'POST /:id/accuse',
    'GET /:id/result'
  ]) assert.ok(routes.includes(route), `Missing route ${route}`);
});

test('API input schemas trim and constrain premises and reject invalid or extra fields', () => {
  assert.equal(createSchema.parse({ premise: '  A sufficiently detailed mystery premise.  ', difficulty: 'easy' }).premise, 'A sufficiently detailed mystery premise.');
  assert.throws(() => createSchema.parse({ premise: 'too short', difficulty: 'easy' }));
  assert.throws(() => createSchema.parse({ premise: 'A valid premise with enough detail.', difficulty: 'impossible' }));
  assert.throws(() => createSchema.parse({ premise: 'A valid premise with enough detail.', difficulty: 'easy', culpritId: 'secret' }));
  assert.equal(accuseSchema.parse({ suspectId: 'suspect-1' }).suspectId, 'suspect-1');
  assert.throws(() => accuseSchema.parse({ suspectId: 'x', answer: 'culprit' }));
});
