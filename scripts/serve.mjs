import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { serveStatic, readBody } from './static-handler.mjs';
import { loadEntries, saveEntry, writeExport } from './leaderboard-store.mjs';
import { LeaderboardError } from '../src/core/leaderboard.mjs';
const args = process.argv.slice(2);
// Ticket-04 §3: `npm start -- --export-leaderboard out.json` writes {"entries": [...]} and exits 0.
const exportAt = args.indexOf('--export-leaderboard');
if (exportAt >= 0) {
  const out = args[exportAt + 1];
  if (!out || out.startsWith('--')) { console.error('--export-leaderboard needs an output path'); process.exit(2); }
  await writeExport(out); process.exit(0);
}
const root = resolve('dist'); const port = Number(process.env.PORT || 4173);
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/api/leaderboard') {
    try {
      if (req.method === 'GET') return send(res, 200, { entries: await loadEntries() });
      if (req.method === 'POST') return send(res, 200, await saveEntry(JSON.parse(await readBody(req))));
      return send(res, 405, { error: 'method not allowed' });
    } catch (e) { return send(res, e instanceof LeaderboardError || e instanceof SyntaxError ? 400 : 500, { error: e.message }); }
  }
  return serveStatic(root, req, res);
}).listen(port, '0.0.0.0', () => console.log(`Đảo Đèn Lồng: http://localhost:${port}`));
