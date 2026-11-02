import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema({ id: String, name: String, description: String }, { _id: false });
const clueSchema = new mongoose.Schema({ id: String, description: String, discovered: { type: Boolean, default: false } }, { _id: false });
const hintSchema = new mongoose.Schema({ text: String, used: { type: Boolean, default: false } }, { _id: false });

const caseSchema = new mongoose.Schema({
  premise: { type: String, required: true }, title: { type: String, required: true }, story: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  suspects: [suspectSchema], clues: [clueSchema], culpritId: { type: String, select: false },
  solution: { type: String, select: false }, hints: { type: [hintSchema], select: false }, hintsUsed: { type: Number, default: 0 },
  maxHints: { type: Number, required: true }, baseScore: { type: Number, required: true }, finalScore: { type: Number, default: null },
  accusationStatus: { type: String, enum: ['pending', 'submitted'], default: 'pending' }, accusationId: { type: String, default: null, select: false },
  correct: { type: Boolean, default: null }
}, { timestamps: true });

export default mongoose.model('Case', caseSchema);
