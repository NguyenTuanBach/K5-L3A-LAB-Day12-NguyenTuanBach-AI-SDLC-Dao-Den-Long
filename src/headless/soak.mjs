// Ticket-04 soak test: N consecutive nights in one process with seeded random input.
// Usage: node --expose-gc src/headless/soak.mjs --seed 7 --nights 10 --out soak.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createGame, step } from '../core/simulation.mjs';
import { DataError } from '../core/validation.mjs';
import v8 from 'node:v8';
import vm from 'node:vm';
v8.setFlagsFromString('--expose-gc');
const collect = globalThis.gc ?? vm.runInNewContext('gc');

function parse(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]?.slice(2);
    if (!args[i]?.startsWith('--') || !['seed', 'nights', 'out'].includes(name) || args[i + 1] === undefined || args[i + 1].startsWith('--') || name in out) throw new DataError(`Invalid argument: ${args[i]}`);
    out[name] = args[i + 1];
  }
  for (const name of ['seed', 'nights']) if (!/^-?\d+$/.test(out[name] ?? '')) throw new DataError(`${name} must be an integer`);
  out.seed = Number(out.seed); out.nights = Number(out.nights);
  if (out.nights < 1 || !out.out) throw new DataError('Require --seed N --nights >=1 --out path');
  return out;
}
const mb = (settle = false) => { if (settle) { collect(); collect(); } return Math.round(process.memoryUsage().rss / 1048576 * 10) / 10; };
function rng(seed) { let x = (seed >>> 0) || 0x6d2b79f5; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const inputFor = r => { let move = [0, 0], k = 0; return () => { if (k++ % 30 === 0) { const a = r() * Math.PI * 2; move = [Math.cos(a), Math.sin(a)]; } return { move, jump: r() < 0.05, dash: r() < 0.03, pulse: r() < 0.02, interact: r() < 0.10 }; }; };
function play(g, seed, ticksCap = Infinity) {
  const next = inputFor(rng(seed * 7919 + g.night));
  for (let k = 0; k < ticksCap && g.state === 'playing'; k++) step(g, next());
  return g.state;
}
// Throwaway JIT/heap warm-up so mem_start reflects steady state, not first-run compilation (documented in README).
function warmUp(tuning) { for (let i = 1; i <= 30; i++) { const night = ((i - 1) % 3) + 1; play(createGame(tuning, 1000 + i, {}, night), 1000 + i, 20000); } collect(); }
export async function soak(tuning, { seed, nights }) {
  const started = performance.now(); let crashes = 0, memStart = null, memEnd = null; const results = [];
  warmUp(tuning);
  for (let i = 1; i <= nights; i++) {
    const night = ((i - 1) % 3) + 1;
    try {
      const g = createGame(tuning, seed + i, {}, night);
      if (i === 1) memStart = mb();
      results.push(play(g, seed + i));
    } catch (e) { crashes++; results.push('crashed'); console.error(`Night ${i} crashed: ${e.stack}`); }
  }
  memEnd = mb(true);
  return { nights, crashes, results, mem_start_mb: memStart ?? memEnd, mem_end_mb: memEnd, duration_s: Math.round((performance.now() - started)) / 1000 };
}
if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1]?.endsWith('soak.mjs')) {
  try {
    const args = parse(process.argv.slice(2));
    const { tuning } = JSON.parse((await readFile(new URL('../../game.contract.json', import.meta.url), 'utf8')).replace(/^﻿/, ''));
    const result = await soak(tuning, args);
    await mkdir(dirname(args.out), { recursive: true });
    await writeFile(args.out, JSON.stringify(result) + '\n', 'utf8');
    console.log(JSON.stringify(result));
    process.exitCode = result.crashes === 0 && result.mem_end_mb <= 1.2 * result.mem_start_mb ? 0 : 1;
  } catch (e) { console.error(e.message); process.exitCode = e instanceof DataError ? 2 : 1; }
}
