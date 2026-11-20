// Ticket-04 local leaderboard rules shared by the server, web UI and tests.
export const NAME_RE = /^[A-Za-z0-9_]{3,12}$/;
export const MAX_ENTRIES = 10;
const ISO_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
export class LeaderboardError extends Error {}
export function isoWithOffset(date = new Date()) {
  const off = -date.getTimezoneOffset(), sign = off >= 0 ? '+' : '-', abs = Math.abs(off), p = n => String(n).padStart(2, '0');
  const local = new Date(date.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${local}${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`;
}
export function validateEntry(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) throw new LeaderboardError('entry must be an object');
  if (typeof e.name !== 'string' || !NAME_RE.test(e.name)) throw new LeaderboardError('Tên cần 3-12 ký tự gồm chữ A-Z, a-z, số hoặc _');
  if (!Number.isSafeInteger(e.score) || e.score < 0) throw new LeaderboardError('score must be a non-negative integer');
  if (!Number.isInteger(e.nights_won) || e.nights_won < 0 || e.nights_won > 3) throw new LeaderboardError('nights_won must be 0-3');
  if (typeof e.achieved_at !== 'string' || !ISO_TZ.test(e.achieved_at) || Number.isNaN(Date.parse(e.achieved_at))) throw new LeaderboardError('achieved_at must be ISO 8601 with timezone');
  if (!Number.isSafeInteger(e.seed)) throw new LeaderboardError('seed must be an integer');
  return { name: e.name, score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed };
}
// Score desc; equal score -> earlier achieved_at first; still equal -> older entry first. Keeps the top 10.
export function addEntry(entries, entry) {
  const clean = validateEntry(entry);
  const all = [...entries.map(validateEntry), clean].map((v, i) => ({ v, i, t: Date.parse(v.achieved_at) }));
  all.sort((a, b) => b.v.score - a.v.score || a.t - b.t || a.i - b.i);
  const top = all.slice(0, MAX_ENTRIES);
  return { entries: top.map(x => x.v), rank: top.findIndex(x => x.v === clean) + 1 || null };
}
export function normalize(data) {
  const list = Array.isArray(data?.entries) ? data.entries : [];
  const ok = [];
  for (const e of list) { try { ok.push(validateEntry(e)); } catch { /* drop corrupt rows */ } }
  return addEntries(ok);
}
function addEntries(list) {
  const all = list.map((v, i) => ({ v, i, t: Date.parse(v.achieved_at) }));
  all.sort((a, b) => b.v.score - a.v.score || a.t - b.t || a.i - b.i);
  return all.slice(0, MAX_ENTRIES).map(x => x.v);
}
