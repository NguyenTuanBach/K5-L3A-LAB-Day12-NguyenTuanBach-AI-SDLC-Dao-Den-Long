// Ticket-04 §1: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--headless] [--browser path]
// Serves dist/ locally, opens the benchmark scene (?bench=1) in a 1280x720 browser window with vsync/frame cap disabled,
// receives per-frame times from the page, computes the statistics and exits 0.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { benchStats } from '../src/core/metrics.mjs';
import { serveStatic, readBody } from './static-handler.mjs';
import { launch, browserRssMb, BENCH_FLAGS } from './browser.mjs';

function parse(argv) {
  const o = { seed: '42', duration: '30' }, flags = new Set(['headless']);
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--')) throw new Error(`Invalid argument: ${argv[i]}`);
    if (flags.has(name)) { o[name] = true; continue; }
    if (!['seed', 'duration', 'out', 'browser'].includes(name) || argv[i + 1] === undefined) throw new Error(`Invalid argument: ${argv[i]}`);
    o[name] = argv[++i];
  }
  if (!/^\d+$/.test(o.seed) || !(Number(o.duration) > 0) || !o.out) throw new Error('Require --seed N --duration SECONDS(>0) --out path');
  return { seed: Number(o.seed), duration: Number(o.duration), out: o.out, headless: !!o.headless, browser: o.browser };
}
const mem = { peak: null };
let args, server, browser, sampler;
try {
  args = parse(process.argv.slice(2));
  if (!existsSync('dist/index.html')) { console.error('dist/ missing: running npm run build'); if (spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' }).status !== 0) throw new Error('build failed'); }
  const result = await new Promise((resolveResult, reject) => {
    server = createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/bench-result') {
        try { const body = JSON.parse(await readBody(req, 64 * 1024 * 1024)); res.writeHead(204); res.end(); resolveResult(body); } catch (e) { res.writeHead(400); res.end(); reject(e); }
        return;
      }
      return serveStatic(resolve('dist'), req, res);
    }).listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/?bench=1&seed=${args.seed}&duration=${args.duration}&post=${encodeURIComponent(`http://127.0.0.1:${port}/bench-result`)}`;
      browser = launch({ url, headless: args.headless, flags: BENCH_FLAGS, browser: args.browser });
      browser.proc.on('error', reject);
      browser.proc.on('exit', code => { if (!browser.finished) reject(new Error(`Browser exited early (code ${code})`)); });
      sampler = setInterval(() => { const v = browserRssMb(browser.dir); if (v !== null) mem.peak = Math.max(mem.peak ?? 0, v); }, 1500);
      setTimeout(() => reject(new Error('Benchmark timed out')), (args.duration + 60) * 1000);
    });
  });
  browser.finished = true;
  const stats = benchStats(result.dts);
  const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
  const cpu = os.cpus()[0]?.model?.trim() ?? 'unknown CPU';
  const out = {
    contract_version: '1.3',
    avg_fps: round(stats.avg_fps), p1_low_fps: round(stats.p1_low_fps), frame_ms_p95: round(stats.frame_ms_p95, 2), frames: stats.frames,
    load_ms: Math.max(0, result.first_frame_epoch - browser.spawnedAt),
    peak_mem_mb: mem.peak === null ? null : Math.round(mem.peak),
    vsync_off: true,
    renderer: `${result.renderer}; ${result.user_agent.match(/(Edg|Chrome|HeadlessChrome)\/[\d.]+/)?.[0] ?? 'Chromium'}; canvas ${result.canvas.join('x')}`,
    os: `${os.type()} ${os.release()} ${os.arch()}; ${cpu}; ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`,
  };
  if (out.peak_mem_mb === null) out.peak_mem_note = 'Browser process memory could not be sampled on this OS.';
  await mkdir(dirname(resolve(args.out)), { recursive: true });
  await writeFile(args.out, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(out));
  process.exitCode = 0;
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally { clearInterval(sampler); browser?.close(); server?.close(); }
process.exit(process.exitCode);
