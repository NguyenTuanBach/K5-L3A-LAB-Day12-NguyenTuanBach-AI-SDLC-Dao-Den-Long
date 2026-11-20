// Disk persistence for the local leaderboard (Ticket-04 §3). Default: data/leaderboard.json, override with DAO_DATA_DIR.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { addEntry, normalize, isoWithOffset } from '../src/core/leaderboard.mjs';
export const leaderboardFile = () => resolve(process.env.DAO_DATA_DIR || 'data', 'leaderboard.json');
export async function loadEntries(file = leaderboardFile()) {
  try { return normalize(JSON.parse((await readFile(file, 'utf8')).replace(/^﻿/, ''))); } catch { return []; }
}
export async function writeExport(path, file = leaderboardFile()) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, JSON.stringify({ entries: await loadEntries(file) }, null, 2) + '\n', 'utf8');
}
let queue = Promise.resolve();
export function saveEntry({ name, score, nights_won, seed }, file = leaderboardFile(), now = new Date()) {
  const job = queue.then(async () => {
    const result = addEntry(await loadEntries(file), { name, score, nights_won, seed, achieved_at: isoWithOffset(now) });
    await mkdir(dirname(file), { recursive: true });
    await writeFile(`${file}.tmp`, JSON.stringify({ entries: result.entries }, null, 2) + '\n', 'utf8');
    await rename(`${file}.tmp`, file);
    return result;
  });
  queue = job.catch(() => {});
  return job;
}
