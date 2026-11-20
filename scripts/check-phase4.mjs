// Ticket-04 headless verification: bench-scene determinism, soak determinism and thresholds, CLI regression.
// PROOF_DIR (optional) receives the evidence files; default docs/proof/phase-4.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { step, snapshot } from '../src/core/simulation.mjs';
import { createBenchGame } from '../src/core/bench.mjs';
import { soak } from '../src/headless/soak.mjs';
const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url)));
const proof = resolve(process.env.PROOF_DIR || 'docs/proof/phase-4'); mkdirSync(proof, { recursive: true });
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// 1. Bench scene: same seed -> identical snapshots; hash is compared between Windows and Linux (Docker) runs.
const run = seed => { const g = createBenchGame(contract.tuning, seed); for (let i = 0; i < 1800; i++) step(g, {}); return snapshot(g); };
const a = run(42), b = run(42);
assert.deepEqual(a, b); assert.equal(a.shades.length, 200); assert.equal(a.motes_active, 100); assert.equal(a.state, 'playing');
writeFileSync(join(proof, `bench-scene-${process.platform}.json`), JSON.stringify({ seed: 42, ticks: 1800, sha256: sha(a) }, null, 2) + '\n');

// 2. Soak: thresholds and determinism of results/seed.
const first = await soak(contract.tuning, { seed: 7, nights: 10 }), second = await soak(contract.tuning, { seed: 7, nights: 10 });
assert.equal(first.crashes, 0); assert.ok(first.mem_end_mb <= 1.2 * first.mem_start_mb, JSON.stringify(first));
assert.deepEqual(first.results, second.results);

// 3. CLI contract unchanged: Phase 1 headless command still writes the same bytes twice.
const cli = out => spawnSync(process.execPath, ['src/headless/cli.mjs', '--seed', '42', '--night', '1', '--ticks', '600', '--out', out], { encoding: 'utf8' });
const o1 = join(proof, 'cli-a.jsonl'), o2 = join(proof, 'cli-b.jsonl');
assert.equal(cli(o1).status, 0); assert.equal(cli(o2).status, 0); assert.deepEqual(readFileSync(o1), readFileSync(o2));
writeFileSync(join(proof, `check-phase4-${process.platform}.json`), JSON.stringify({ bench_scene_sha256: sha(a), soak: first, cli_sha256: createHash('sha256').update(readFileSync(o1)).digest('hex') }, null, 2) + '\n');
console.log(`PASS bench scene deterministic (200 shades/100 motes), soak ${first.nights} nights crashes=${first.crashes} mem ${first.mem_start_mb}->${first.mem_end_mb} MB, CLI bytes stable`);
