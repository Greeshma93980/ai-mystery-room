export function scoreCase({ correct, baseScore, cluesFound, hintsUsed }) {
  if (!correct) return 0;
  return Math.max(0, baseScore + cluesFound * 5 - hintsUsed * 10);
}

export function caseRecordData(input, mystery) {
  return {
    ...input,
    ...mystery,
    clues: mystery.clues.map(clue => ({ ...clue, discovered: false })),
    hints: mystery.hints.map(text => ({ text, used: false }))
  };
}

export function publicCase(c) {
  return {
    id: c._id,
    premise: c.premise,
    title: c.title,
    story: c.story,
    difficulty: c.difficulty,
    suspects: c.suspects,
    clues: c.clues.map(x => ({ id: x.id, discovered: x.discovered, ...(x.discovered ? { description: x.description } : {}) })),
    hintsUsed: c.hintsUsed,
    maxHints: c.maxHints,
    baseScore: c.baseScore,
    accusationStatus: c.accusationStatus,
    discoveredCount: c.clues.filter(x => x.discovered).length,
    totalClues: c.clues.length,
    createdAt: c.createdAt
  };
}
