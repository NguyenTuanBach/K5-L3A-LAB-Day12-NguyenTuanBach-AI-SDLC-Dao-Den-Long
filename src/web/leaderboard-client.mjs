// Browser side of the local leaderboard: disk via the game server, browser storage as fallback (static hosting).
import { addEntry, normalize, isoWithOffset } from '../core/leaderboard.mjs';
const KEY = 'dao-leaderboard';
const readLocal = () => { try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return []; } };
export async function loadScores() {
  try { const r = await fetch('/api/leaderboard', { cache: 'no-store' }); if (r.ok) return normalize(await r.json()); } catch { /* static host */ }
  return readLocal();
}
export async function saveScore({ name, score, nights_won, seed }) {
  let rejected = null;
  try {
    const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, score, nights_won, seed }) });
    const body = await r.json();
    if (r.ok) return { ...body, storage: 'disk' };
    if (r.status === 400) rejected = body.error;
  } catch { /* no server API: fall back */ }
  if (rejected) throw new Error(rejected);
  const result = addEntry(readLocal(), { name, score, nights_won, seed, achieved_at: isoWithOffset() });
  try { localStorage.setItem(KEY, JSON.stringify({ entries: result.entries })); } catch { throw new Error('Không lưu được điểm trên trình duyệt này.'); }
  return { ...result, storage: 'browser' };
}
