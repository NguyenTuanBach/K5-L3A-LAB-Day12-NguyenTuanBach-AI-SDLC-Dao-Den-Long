import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createGame, step, snapshot } from '../src/core/simulation.mjs';
import { createBenchGame, benchCamera } from '../src/core/bench.mjs';
import { benchStats } from '../src/core/metrics.mjs';
import { addEntry, validateEntry, isoWithOffset, normalize, MAX_ENTRIES } from '../src/core/leaderboard.mjs';
import { saveEntry, loadEntries } from '../scripts/leaderboard-store.mjs';
import { soak } from '../src/headless/soak.mjs';
import { rebind, sanitize, defaultBindings, findConflict, ACTIONS } from '../src/web/keymap.mjs';
import { keyboardInput } from '../src/web/input.mjs';
const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url)));
const t = contract.tuning;
const entry = (name, score, at = '2026-11-20T10:00:00+07:00') => ({ name, score, nights_won: 1, achieved_at: at, seed: 42 });

test('contract 1.3 declares bench_cmd and soak_cmd and keeps earlier fields', () => {
  assert.equal(contract.contract_version, '1.3');
  assert.match(contract.bench_cmd, /bench/); assert.match(contract.soak_cmd, /soak/);
  for (const k of ['build_cmd', 'run_cmd', 'headless_cmd']) assert.ok(contract[k]);
  assert.equal(t.fuel_max, 100); assert.equal(t.capacity_max, 20);
});
test('bench statistics follow the ticket definitions', () => {
  const s = benchStats([10, 10, 10, 10, 20]);
  assert.equal(s.frames, 5); assert.equal(s.avg_fps, 1000 * 5 / 60);
  assert.equal(s.p1_low_fps, 1000 / 20);            // k = max(1, ceil(0.05)) = 1 -> worst frame
  assert.equal(s.frame_ms_p95, 20);                  // ceil(0.95*5) = 5th smallest
  const two = Array.from({ length: 200 }, (_, i) => i < 198 ? 10 : 30 + i);   // k = ceil(2) = 2 -> mean(228, 229)
  assert.ok(Math.abs(benchStats(two).p1_low_fps - 1000 / 228.5) < 1e-9);
  assert.throws(() => benchStats([])); assert.throws(() => benchStats([10, 0]));
});
test('bench camera: starts at (30,15,0), 15 s lap, counter-clockwise from above, radius 30 height 15', () => {
  assert.deepEqual(benchCamera(0).position, [30, 15, 0]);
  const quarter = benchCamera(3.75).position; assert.ok(Math.abs(quarter[0]) < 1e-9 && Math.abs(quarter[2] + 30) < 1e-9);
  const lap = benchCamera(15).position; assert.ok(Math.abs(lap[0] - 30) < 1e-9 && Math.abs(lap[2]) < 1e-9);
  for (const time of [0, 1.3, 7.7, 11]) { const [x, y, z] = benchCamera(time).position; assert.ok(Math.abs(Math.hypot(x, z) - 30) < 1e-9); assert.equal(y, 15); }
});
test('bench scene: exactly 200 wandering shades, 100 motes, L1-L3 lit with fuel 100, deterministic by seed', () => {
  const g = createBenchGame(t, 42);
  assert.equal(g.shades.length, 200); assert.ok(g.shades.every(s => s.state === 'wander'));
  assert.equal(g.motes.length, 100);
  assert.deepEqual(g.lanterns.map(l => [l.id, l.lit, l.fuelUnits]), [['L1', true, 6000], ['L2', true, 6000], ['L3', true, 6000], ['L4', false, 0], ['L5', false, 0]]);
  assert.ok(g.shades.every(s => Math.hypot(s.pos[0], s.pos[2]) <= 40));
  assert.equal(new Set(g.shades.map(s => s.pos.join())).size, 200);
  assert.deepEqual(snapshot(createBenchGame(t, 42)), snapshot(g));
  assert.notDeepEqual(snapshot(createBenchGame(t, 43)).shades, snapshot(g).shades);
});
test('bench scene: no spawns, damage, pickups, fuel decay or night end; shades keep moving; player stays at origin', () => {
  const g = createBenchGame(t, 42); const before = snapshot(g);
  for (let i = 0; i < 60 * 20; i++) step(g, {});
  const after = snapshot(g);
  assert.equal(g.state, 'playing'); assert.equal(after.shades.length, 200); assert.equal(after.motes_active, 100);
  assert.deepEqual(after.player.pos, [0, 0, 0]); assert.equal(after.player.flames, 3);
  assert.deepEqual(after.lanterns.slice(0, 3).map(l => l.fuel), [100, 100, 100]);
  assert.ok(after.shades.some((s, i) => s.pos.join() !== before.shades[i].pos.join()), 'shades must still wander');
  assert.equal(after.drifters.length, 0);
});
test('bench flag does not alter ordinary gameplay (fuel still decays, dawn still ends the night)', () => {
  const g = createGame(t, 42, { lanterns: [{ id: 'L1', lit: true, fuel: 1 }], random_shades: false, random_motes: false });
  for (let i = 0; i < 61; i++) step(g, {});
  assert.equal(g.lanterns[0].lit, false);
  const dawn = createGame(t, 42, { time_left_s: 0.01, random_shades: false });
  step(dawn, {}); assert.equal(dawn.state, 'lost');
});
test('leaderboard: name rule 3-12 [A-Za-z0-9_]', () => {
  for (const name of ['abc', 'Bach_2026', 'A'.repeat(12)]) assert.doesNotThrow(() => validateEntry(entry(name, 1)));
  for (const name of ['ab', 'A'.repeat(13), 'có dấu', 'a b c', 'a-b-c', '', 5]) assert.throws(() => validateEntry(entry(name, 1)), `${name}`);
  assert.throws(() => validateEntry({ ...entry('abc', 1), achieved_at: '2026-11-20T10:00:00' }), /timezone/);
  assert.throws(() => validateEntry({ ...entry('abc', 1), nights_won: 4 })); assert.throws(() => validateEntry(entry('abc', -1)));
});
test('leaderboard: top 10 by score desc, tie -> earlier achieved_at first, lowest dropped', () => {
  let entries = [];
  for (let i = 0; i < 12; i++) entries = addEntry(entries, entry(`P${String(i).padStart(2, '0')}`, 100 + i * 10, `2026-11-20T10:${String(i).padStart(2, '0')}:00+07:00`)).entries;
  assert.equal(entries.length, MAX_ENTRIES);
  assert.deepEqual(entries.map(e => e.score), [210, 200, 190, 180, 170, 160, 150, 140, 130, 120]);
  const late = addEntry(entries, entry('Late', 150, '2026-11-20T12:00:00+07:00'));
  const early = addEntry(entries, entry('Early', 150, '2026-11-20T09:00:00+07:00'));
  const names = r => r.entries.map(e => e.name);
  assert.ok(names(late).indexOf('P05') < names(late).indexOf('Late'));
  assert.ok(names(early).indexOf('Early') < names(early).indexOf('P05'));
  assert.equal(early.rank, 7);
  const tz = addEntry([], entry('Aaa', 5, '2026-11-20T09:00:00+00:00'));   // 09:00 UTC = 16:00+07
  assert.deepEqual(names(addEntry(tz.entries, entry('Bbb', 5, '2026-11-20T10:00:00+07:00'))), ['Bbb', 'Aaa']);
  assert.equal(addEntry(entries, entry('Low', 1)).rank, null);
});
test('leaderboard: isoWithOffset yields ISO 8601 with timezone; corrupt rows are dropped', () => {
  const iso = isoWithOffset(new Date('2026-11-20T03:04:05Z'));
  assert.match(iso, /^2026-11-20T\d{2}:04:05[+-]\d{2}:\d{2}$|^2026-11-2[01]T\d{2}:04:05[+-]\d{2}:\d{2}$/);
  assert.equal(Date.parse(iso), Date.parse('2026-11-20T03:04:05Z'));
  assert.deepEqual(normalize({ entries: [entry('Good', 3), { name: 'x' }, 7] }).map(e => e.name), ['Good']);
  assert.deepEqual(normalize(null), []);
});
test('leaderboard persists on disk across restarts and --export-leaderboard writes {entries} in order', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dao-lb-')); const file = join(dir, 'leaderboard.json');
  await saveEntry({ name: 'Anna', score: 300, nights_won: 3, seed: 42 }, file, new Date('2026-11-20T01:00:00Z'));
  await saveEntry({ name: 'Ben_1', score: 100, nights_won: 1, seed: 42 }, file, new Date('2026-11-20T02:00:00Z'));
  await saveEntry({ name: 'Cara', score: 300, nights_won: 2, seed: 42 }, file, new Date('2026-11-20T03:00:00Z'));
  assert.deepEqual((await loadEntries(file)).map(e => e.name), ['Anna', 'Cara', 'Ben_1']);
  const out = join(dir, 'out.json');
  const run = spawnSync(process.execPath, ['scripts/serve.mjs', '--export-leaderboard', out], { env: { ...process.env, DAO_DATA_DIR: dir }, encoding: 'utf8', timeout: 20000 });
  assert.equal(run.status, 0, run.stderr);
  const exported = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(Object.keys(exported), ['entries']);
  assert.deepEqual(exported.entries.map(e => [e.name, e.score, e.nights_won, e.seed]), [['Anna', 300, 3, 42], ['Cara', 300, 2, 42], ['Ben_1', 100, 1, 42]]);
  const empty = spawnSync(process.execPath, ['scripts/serve.mjs', '--export-leaderboard', join(dir, 'e2.json')], { env: { ...process.env, DAO_DATA_DIR: join(dir, 'none') }, encoding: 'utf8', timeout: 20000 });
  assert.equal(empty.status, 0); assert.deepEqual(JSON.parse(readFileSync(join(dir, 'e2.json'), 'utf8')), { entries: [] });
});
test('soak: 10 nights complete in one process with no crash and bounded memory', async () => {
  const r = await soak(t, { seed: 7, nights: 10 });
  assert.equal(r.nights, 10); assert.equal(r.crashes, 0); assert.equal(r.results.length, 10);
  assert.ok(r.results.every(v => v === 'won' || v === 'lost'));
  assert.ok(r.mem_end_mb <= 1.2 * r.mem_start_mb, `${r.mem_end_mb} vs ${r.mem_start_mb}`);
});
test('key rebinding: conflict detected, no change on conflict, defaults restorable, bindings drive input', () => {
  const d = defaultBindings();
  assert.equal(findConflict(d, 'jump', 'KeyE'), 'interact');
  const bad = rebind(d, 'jump', 'KeyE'); assert.equal(bad.ok, false); assert.equal(bad.conflict, 'interact'); assert.deepEqual(bad.bindings, d);
  const ok = rebind(d, 'jump', 'KeyJ'); assert.equal(ok.ok, true); assert.deepEqual(ok.bindings.jump, ['KeyJ']);
  assert.equal(keyboardInput(new Set(['KeyJ']), 0, ok.bindings).jump, true); assert.equal(keyboardInput(new Set(['Space']), 0, ok.bindings).jump, false);
  assert.equal(rebind(ok.bindings, 'jump', 'KeyJ').ok, true, 'rebinding to the same key is not a conflict');
  assert.deepEqual(sanitize({ ...d, jump: ['KeyE'] }), d, 'conflicting stored bindings fall back to defaults');
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(ok.bindings))), ok.bindings);
  assert.deepEqual(sanitize(null), d); assert.equal(ACTIONS.length, 9);
});
