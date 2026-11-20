// Ticket-04 Linux check: clean Docker build (npm ci, npm test, npm run build), headless bench scene + soak in the container,
// and byte-for-byte comparison of the bench-scene hash with the Windows/macOS/host run.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const proof = resolve('docs/proof/phase-4'); mkdirSync(proof, { recursive: true });
const tag = 'dao-den-long:phase-4';
const commands = [
  ['build', ['build', '-t', tag, '.']],
  ['tests', ['run', '--rm', tag, 'npm', 'test']],
  ['check', ['run', '--rm', '--mount', `type=bind,source=${proof},target=/proof`, '-e', 'PROOF_DIR=/proof/linux', tag, 'node', 'scripts/check-phase4.mjs']],
  ['soak', ['run', '--rm', tag, 'node', 'src/headless/soak.mjs', '--seed', '7', '--nights', '10', '--out', '/tmp/soak.json']],
  ['environment', ['run', '--rm', tag, 'node', '-e', 'console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch}))']],
];
const results = [];
for (const [name, args] of commands) {
  const r = spawnSync('docker', args, { encoding: 'utf8', timeout: 600000, maxBuffer: 20 * 1024 * 1024 });
  writeFileSync(`${proof}/linux-${name}.log`, (r.stdout || '') + (r.stderr || '') + (r.error ? '\n' + r.error : ''));
  assert.equal(r.status, 0, `Docker ${name} failed; see docs/proof/phase-4/linux-${name}.log`);
  results.push({ name, command: ['docker', ...args], exit: r.status });
}
const host = JSON.parse(readFileSync(`${proof}/bench-scene-${process.platform}.json`)), linux = JSON.parse(readFileSync(`${proof}/linux/bench-scene-linux.json`));
assert.equal(linux.sha256, host.sha256, 'bench scene differs between host and Linux');
results.push({ name: 'bench-scene-host-linux-parity', status: 'PASS', sha256: linux.sha256 });
writeFileSync(`${proof}/linux-results.json`, JSON.stringify(results, null, 2) + '\n');
console.log('PASS: Linux clean build, npm test, Phase 4 headless checks, soak and bench-scene parity');
