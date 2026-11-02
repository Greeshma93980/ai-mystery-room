import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' }, timeout: 120000 });
function expect(condition, message) { if (!condition) throw new Error(`Invalid API response: ${message}`); }
function checkCase(value) {
  expect(value && typeof value.id === 'string' && typeof value.title === 'string' && typeof value.story === 'string', 'case identity is missing');
  expect(['easy', 'medium', 'hard'].includes(value.difficulty), 'difficulty is invalid');
  expect(Array.isArray(value.suspects) && value.suspects.every(x => typeof x.id === 'string' && typeof x.name === 'string' && typeof x.description === 'string'), 'suspects are invalid');
  expect(Array.isArray(value.clues) && value.clues.every(x => typeof x.id === 'string' && typeof x.discovered === 'boolean' && (x.discovered ? typeof x.description === 'string' : !('description' in x))), 'clues are invalid');
  expect(Number.isInteger(value.hintsUsed) && Number.isInteger(value.maxHints) && Number.isInteger(value.baseScore), 'score or hint counts are invalid');
  return value;
}
function checked(promise, check) { return promise.then(response => check(response.data)); }
export const casesApi = {
  create: body => checked(api.post('/cases', body), d => checkCase(d.case)),
  get: id => checked(api.get(`/cases/${id}`), d => checkCase(d.case)),
  discover: (id, clueId) => checked(api.post(`/cases/${id}/clues/${clueId}/discover`), d => { checkCase(d.case); expect(typeof d.newlyDiscovered === 'boolean', 'clue status is missing'); return d; }),
  hint: id => checked(api.post(`/cases/${id}/hints`), d => { expect(typeof d.hint === 'string' && Number.isInteger(d.hintsUsed) && Number.isInteger(d.maxHints), 'hint response is invalid'); return d; }),
  accuse: (id, suspectId) => checked(api.post(`/cases/${id}/accuse`, { suspectId }), d => { expect(typeof d.correct === 'boolean' && Number.isFinite(d.finalScore) && typeof d.caseId === 'string', 'verdict is invalid'); return d; }),
  result: id => checked(api.get(`/cases/${id}/result`), d => { const r=d.result; expect(r && typeof r.correct === 'boolean' && typeof r.culprit?.name === 'string' && typeof r.solution === 'string' && Number.isFinite(r.finalScore) && Array.isArray(r.discoveredClues) && Array.isArray(r.usedHints), 'result is invalid'); return r; })
};
export const messageOf = error => {
  if (error.response) return error.response.data?.error || `The API returned HTTP ${error.response.status}.`;
  if (error.message?.startsWith('Invalid API response:')) return error.message;
  if (error.code === 'ECONNABORTED') return 'The case server took too long to respond. Check the backend log and try again.';
  const base = api.defaults.baseURL;
  return `The browser could not complete a request to ${base}. Check that the backend is running and CORS allows this page origin.`;
};
