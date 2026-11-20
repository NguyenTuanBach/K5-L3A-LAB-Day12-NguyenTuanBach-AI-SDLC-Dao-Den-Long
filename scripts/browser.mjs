// Launch a Chromium-family browser (Chrome, Edge, Chromium) and drive it over the DevTools protocol. No dependencies.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function findBrowser() {
  if (process.env.DAO_BROWSER) return process.env.DAO_BROWSER;
  const win = ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'].flatMap(v => process.env[v] ? [
    join(process.env[v], 'Google/Chrome/Application/chrome.exe'), join(process.env[v], 'Microsoft/Edge/Application/msedge.exe')] : []);
  const mac = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium'];
  const linux = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'].map(n => { const r = spawnSync('which', [n], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; });
  return [...(process.platform === 'win32' ? win : process.platform === 'darwin' ? mac : linux)].find(p => p && existsSync(p)) ?? null;
}

export const BENCH_FLAGS = ['--disable-frame-rate-limit', '--disable-gpu-vsync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion'];

export function launch({ url, width = 1280, height = 720, headless = false, app = true, flags = [], browser = findBrowser() }) {
  if (!browser) throw new Error('Không tìm thấy Chrome/Edge/Chromium. Đặt biến môi trường DAO_BROWSER tới file thực thi của trình duyệt.');
  const dir = mkdtempSync(join(tmpdir(), 'dao-browser-'));
  const args = [`--user-data-dir=${dir}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', `--window-size=${width},${height}`, '--window-position=0,0',
    ...(headless ? ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), ...(process.platform === 'linux' ? ['--no-sandbox'] : []), ...flags, app ? `--app=${url}` : url];
  const proc = spawn(browser, args, { stdio: 'ignore', detached: false });
  const handle = { proc, dir, browser, spawnedAt: Date.now(), cdp: null,
    async connect() {
      const portFile = join(dir, 'DevToolsActivePort');
      for (let i = 0; i < 200 && !existsSync(portFile); i++) await new Promise(r => setTimeout(r, 100));
      if (!existsSync(portFile)) throw new Error('Browser did not expose a DevTools port');
      const port = readFileSync(portFile, 'utf8').split('\n')[0];
      let page;
      for (let i = 0; i < 100 && !page; i++) { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); if (!page) await new Promise(r => setTimeout(r, 100)); }
      const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      handle.cdp = new Cdp(ws); return handle.cdp;
    },
    close() {
      try { handle.cdp?.ws.close(); } catch { /* already closed */ }
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); else { try { proc.kill('SIGKILL'); } catch { /* gone */ } spawnSync('pkill', ['-f', dir], { stdio: 'ignore' }); }
      for (let i = 0; i < 5; i++) { try { rmSync(dir, { recursive: true, force: true }); break; } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300); } }
    } };
  return handle;
}

/** Sum of resident memory (MB) of every process of this browser instance (matched by its user-data-dir), or null. */
export function browserRssMb(dir) {
  try {
    if (process.platform === 'win32') {
      const ps = `(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${dir.replace(/'/g, "''")}') } | Measure-Object WorkingSetSize -Sum).Sum`;
      const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 15000 });
      const v = Number(r.stdout.trim()); return Number.isFinite(v) && v > 0 ? v / 1048576 : null;
    }
    const r = spawnSync('ps', ['-axo', 'rss=,command='], { encoding: 'utf8', timeout: 15000 });
    const kb = r.stdout.split('\n').filter(l => l.includes(dir)).reduce((a, l) => a + (Number(l.trim().split(/\s+/)[0]) || 0), 0);
    return kb > 0 ? kb / 1024 : null;
  } catch { return null; }
}

export class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); ws.onmessage = ev => { const m = JSON.parse(ev.data); const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } }; }
  send(method, params = {}) { return new Promise((res, rej) => { const id = ++this.id; this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async screenshot(path) { const r = await this.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path, Buffer.from(r.data, 'base64')); }
  async key(type, code, key = code) { await this.send('Input.dispatchKeyEvent', { type, code, key, windowsVirtualKeyCode: 0 }); }
  async press(code, key) { await this.key('keyDown', code, key); await this.key('keyUp', code, key); }
}
