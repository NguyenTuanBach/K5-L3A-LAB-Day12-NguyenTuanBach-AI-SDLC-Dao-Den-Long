// Ticket-04 browser verification (accessibility, key rebinding, captions, leaderboard UI + disk persistence).
// Usage: node scripts/check-phase4-browser.mjs [out-dir]   (needs dist/ built and Chrome/Edge/Chromium)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch } from './browser.mjs';

const outDir = resolve(process.argv[2] || 'docs/proof/phase-4'); mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const dataDir = mkdtempSync(join(tmpdir(), 'dao-data-')), port = 4300 + Math.floor(Math.random() * 500);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const pass = (name, extra = {}) => { results.push({ name, pass: true, ...extra }); console.log('PASS', name); };
let server;
async function startServer() {
  server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port), DAO_DATA_DIR: dataDir }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).status) return; } catch { await sleep(100); } }
  throw new Error('server did not start');
}
const stopServer = () => { server?.kill(); server = null; };

let browser, cdp;
const ev = expr => cdp.eval(expr);
const shot = name => cdp.screenshot(join(outDir, 'screenshots', `${name}.png`));
async function open(url) {
  browser?.close(); browser = launch({ url, app: true }); cdp = await browser.connect();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false }); await sleep(2200);
}
const reload = async () => { await cdp.send('Page.reload', { ignoreCache: true }); await sleep(2200); };
const smallText = scale => ev(`JSON.stringify([...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<18*${scale}-0.01;}).map(e=>e.tagName+'#'+e.id+' '+getComputedStyle(e).fontSize))`);
const winScenario = (lit, time = 0.1) => `{random_motes:false,random_shades:false,time_left_s:${time},lanterns:[${lit.map(id => `{id:'${id}',lit:true,fuel:100}`).join(',')}]}`;
const loseScenario = `{random_motes:false,random_shades:false,time_left_s:0.1}`;
const finishNight = async (scenario, night) => { await ev(`window.__lab.start(${scenario},${night}); window.__lab.pause(); window.__lab.advance(Array.from({length:10},()=>({}))); 0`); await sleep(500); };
const submitName = async name => { await ev(`(()=>{const i=document.getElementById('player-name');i.disabled=false;i.value=${JSON.stringify(name)};document.getElementById('name-form').requestSubmit();})()`); await sleep(700); };

try {
  await startServer(); const base = `http://127.0.0.1:${port}/?labtest`;
  await open(base);

  // --- §4 font size: at 1280x720 every visible UI text >= 18 px, in every screen; x1.25 with large text.
  const screens = {
    menu: '0',
    settings: `document.getElementById('menu-settings').click()`,
    leaderboard: `document.getElementById('close-settings').click();document.getElementById('menu-leaderboard').click()`,
    intro: `document.getElementById('close-leaderboard').click();document.getElementById('start').click()`,
    hud: `window.__lab.start({random_motes:false,random_shades:false,shades:[{id:'S1',pos:[0,0,20],state:'wander'}],player:{carried:6},lanterns:[{id:'L1',lit:true,fuel:20}],time_left_s:8}); window.__lab.advance(Array.from({length:30},()=>({})))`,
    result: `window.__lab.start(${loseScenario}); window.__lab.pause(); window.__lab.advance(Array.from({length:10},()=>({})))`,
  };
  for (const [scale, flag] of [[1, 'normal'], [1.25, 'large']]) {
    if (flag === 'large') { await ev(`(()=>{const s=JSON.parse(localStorage.getItem('dao-settings')||'{}');s.largeText=true;localStorage.setItem('dao-settings',JSON.stringify(s));})()`); await reload(); }
    const bad = {};
    for (const [name, action] of Object.entries(screens)) {
      await ev(`(()=>{${action};return 0})()`); await sleep(500);
      if (name === 'hud' || name === 'settings' || name === 'result') await shot(`${flag}-${name}`);
      const list = JSON.parse(await smallText(scale)); if (list.length) bad[name] = list;
    }
    assert(Object.keys(bad).length === 0, `text smaller than ${18 * scale}px: ${JSON.stringify(bad)}`);
    const root = await ev(`getComputedStyle(document.documentElement).fontSize`); assert(parseFloat(root) === 18 * scale, `root font ${root}`);
    pass(`ui-text-min-${18 * scale}px-${flag}`, { screens: Object.keys(screens) });
  }
  await ev(`(()=>{const s=JSON.parse(localStorage.getItem('dao-settings')||'{}');s.largeText=false;localStorage.setItem('dao-settings',JSON.stringify(s));})()`); await reload();

  // --- §4 key rebinding: conflict detection, defaults, persistence, effect in game.
  await ev(`document.getElementById('menu-settings').click()`); await sleep(200);
  const btn = a => `document.querySelector('[data-action=${a}]').textContent`;
  await ev(`document.querySelector('[data-action=jump]').click()`); await cdp.press('KeyE', 'e'); await sleep(200);
  const conflict = await ev(`document.getElementById('keybind-msg').textContent`);
  assert(/đã dùng cho "Tương tác"/.test(conflict) && await ev(btn('jump')) === 'Nhấn phím mới…', `no conflict warning: ${conflict}`);
  await cdp.press('Escape', 'Escape'); await sleep(100);
  assert(await ev(btn('jump')) === 'Space', 'conflict changed the binding');
  await ev(`document.querySelector('[data-action=jump]').click()`); await cdp.press('KeyJ', 'j'); await sleep(200);
  assert(await ev(btn('jump')) === 'J', 'rebind failed');
  assert(await ev(`document.getElementById('controls').textContent.includes('J')`), 'controls bar not updated');
  await shot('keybinds-rebound');
  await reload();   // reload: persisted
  assert(await ev(`JSON.stringify(window.__lab.settings.bindings.jump)`) === '["KeyJ"]', 'binding not persisted');
  await ev(`window.__lab.start({random_motes:false,random_shades:false,motes:[],shades:[]}); 0`); await sleep(300);
  await cdp.key('keyDown', 'KeyJ', 'j'); await sleep(120); const air = await ev(`window.__lab.snapshot().player.pos[1]`); await cdp.key('keyUp', 'KeyJ', 'j');
  assert(air > 0.2, `rebound jump key did not jump (y=${air})`);
  await ev(`window.__lab.pause(); 0`); await sleep(100);
  await ev(`window.__lab.start({random_motes:false,random_shades:false,motes:[],shades:[]}); 0`); await sleep(300);
  await cdp.key('keyDown', 'Space', ' '); await sleep(150); const old = await ev(`window.__lab.snapshot().player.pos[1]`); await cdp.key('keyUp', 'Space', ' ');
  assert(old === 0, 'old Space key still jumps after rebinding');
  await ev(`window.__lab.pause(); document.getElementById('pause-settings')?.click(); 0`); await sleep(200);
  await ev(`document.getElementById('reset-keys').click()`); await sleep(100);
  assert(await ev(btn('jump')) === 'Space' && /mặc định/.test(await ev(`document.getElementById('keybind-msg').textContent`)), 'reset defaults failed');
  pass('key-rebinding-conflict-persist-reset-effect', { conflict });

  // --- §4 reduced motion + captions/indicators.
  await reload();
  await ev(`window.__lab.start({random_motes:false,random_shades:false,motes:[],shades:[{id:'S9',pos:[0.5,0,0],state:'wander'}]}); 0`); await sleep(150);
  const flash = parseFloat(await ev(`document.getElementById('hit-flash').style.opacity||'0'`));
  assert(flash > 0, 'hit flash expected when reduced motion is off');
  await ev(`document.getElementById('menu-settings')?.click(); 0`);
  await reload(); await ev(`(()=>{const s=JSON.parse(localStorage.getItem('dao-settings')||'{}');s.reducedMotion=true;localStorage.setItem('dao-settings',JSON.stringify(s));})()`); await reload();
  await ev(`window.__lab.start({random_motes:false,random_shades:false,motes:[],shades:[{id:'S9',pos:[0.5,0,0],state:'wander'}]}); 0`); await sleep(150);
  assert(await ev(`document.body.classList.contains('reduced-motion')`) && await ev(`getComputedStyle(document.getElementById('hit-flash')).display`) === 'none' && parseFloat(await ev(`document.getElementById('hit-flash').style.opacity||'0'`)) === 0, 'reduced motion still flashes');
  pass('reduced-motion-disables-screen-flash', { flashOff: flash });
  await ev(`(()=>{const s=JSON.parse(localStorage.getItem('dao-settings')||'{}');s.reducedMotion=false;localStorage.setItem('dao-settings',JSON.stringify(s));})()`); await reload();

  await ev(`window.__lab.start({random_motes:false,motes:[]}); window.__lab.pause(); window.__lab.advance(Array.from({length:310},()=>({}))); 0`); await sleep(500);
  const shadeCaption = await ev(`document.getElementById('captions').textContent`); const arrows = await ev(`document.querySelectorAll('.edge-arrow').length`);
  assert(/Bóng Mực xuất hiện/.test(shadeCaption) && arrows >= 1, `shade caption/arrow missing: ${shadeCaption} ${arrows}`);
  const arrowPos = JSON.parse(await ev(`(()=>{const r=document.querySelector('.edge-arrow').getBoundingClientRect();return JSON.stringify({x:r.x,y:r.y,w:innerWidth,h:innerHeight})})()`));
  assert(arrowPos.x < 90 || arrowPos.y < 90 || arrowPos.x > arrowPos.w - 150 || arrowPos.y > arrowPos.h - 150, `arrow is not at a screen edge ${JSON.stringify(arrowPos)}`);
  await shot('caption-shade-arrow');
  await ev(`window.__lab.start({random_motes:false,random_shades:false,time_left_s:9,lanterns:[{id:'L1',lit:true,fuel:20}]},1); window.__lab.pause(); window.__lab.advance([{}]); 0`); await sleep(300);
  const tenSec = await ev(`document.getElementById('captions').textContent`); assert(/Còn \d+ giây/.test(tenSec) && /Đèn L1 sắp cạn dầu/.test(tenSec), `10s/low-fuel caption missing: ${tenSec}`);
  await ev(`window.__lab.start({random_motes:false,random_shades:false,random_drifters:false},3); window.__lab.pause(); window.__lab.advance(Array.from({length:1685},()=>({}))); 0`); await sleep(300);
  const wind = await ev(`document.getElementById('captions').textContent`); assert(/Gió sắp thổi/.test(wind), `wind caption missing: ${wind}`);
  pass('captions-and-indicators', { shadeCaption, tenSec, wind, arrows });

  // --- §3 leaderboard through the real UI and the real server.
  await reload();
  await finishNight(winScenario(['L1', 'L2', 'L3']), 1);
  assert(await ev(`document.getElementById('result-title').textContent.includes('sáng')`) && await ev(`document.getElementById('name-form').hidden`) === true, 'night-1 win must not offer name entry');
  await finishNight(loseScenario, 2);
  assert(await ev(`document.getElementById('name-form').hidden`) === false, 'loss must offer name entry');
  const label = await ev(`document.querySelector('#name-form label').textContent`); assert(/Lưu 597 điểm \(1\/3 đêm thắng\)/.test(label), label);
  await submitName('ab'); assert(/3-12/.test(await ev(`document.getElementById('name-msg').textContent`)), 'short name accepted');
  await submitName('có dấu'); assert(/3-12/.test(await ev(`document.getElementById('name-msg').textContent`)), 'accented name accepted');
  await shot('name-entry');
  await submitName('Bach_2026'); assert(/Đã lưu! Bach_2026 đứng hạng 1/.test(await ev(`document.getElementById('name-msg').textContent`)), 'save failed');
  await finishNight(winScenario(['L1', 'L2', 'L3', 'L4', 'L5']), 3);
  assert(await ev(`document.getElementById('result-title').textContent.includes('Minh')`) && await ev(`document.getElementById('name-form').hidden`) === false, 'night-3 dawn must offer name entry');
  await submitName('Anna'); assert(/hạng 1/.test(await ev(`document.getElementById('name-msg').textContent`)), 'second save failed');
  await ev(`document.getElementById('to-menu')?.click(); window.__lab.menu(); document.getElementById('menu-leaderboard').click(); 0`); await sleep(700);
  const rows = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('#lb-list li')].map(li=>li.textContent))`));
  assert(rows.length === 2 && rows[0].includes('Anna') && rows[1].includes('Bach_2026'), `leaderboard rows ${JSON.stringify(rows)}`);
  await shot('leaderboard');
  stopServer(); await sleep(300); await startServer(); await reload();   // "close and reopen the game"
  await ev(`document.getElementById('menu-leaderboard').click(); 0`); await sleep(700);
  const after = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('#lb-list li')].map(li=>li.textContent))`)); assert(after.length === 2 && after[0].includes('Anna'), 'leaderboard lost after restart');
  stopServer();
  const out = join(dataDir, 'export.json');
  const exp = spawnSync(process.execPath, ['scripts/serve.mjs', '--export-leaderboard', out], { env: { ...process.env, DAO_DATA_DIR: dataDir }, encoding: 'utf8' });
  assert(exp.status === 0 && existsSync(out), 'export failed'); const exported = JSON.parse(readFileSync(out, 'utf8'));
  assert(exported.entries.length === 2 && exported.entries[0].name === 'Anna' && exported.entries[0].score >= exported.entries[1].score && exported.entries.every(e => e.seed === 42 && /[+-]\d\d:\d\d$|Z$/.test(e.achieved_at)), 'export content wrong');
  writeFileSync(join(outDir, 'leaderboard-export.json'), JSON.stringify(exported, null, 2) + '\n');
  pass('leaderboard-ui-disk-persistence-export', { rows, exported: exported.entries.map(e => [e.name, e.score, e.nights_won]) });

  const info = await ev(`navigator.userAgent`);
  writeFileSync(join(outDir, 'browser-results.json'), JSON.stringify({ status: 'PASS', results, viewport: [1280, 720], userAgent: info }, null, 2) + '\n');
  console.log('PASS: Phase 4 browser checks'); process.exitCode = 0;
} catch (e) {
  console.error('FAIL', e.stack); writeFileSync(join(outDir, 'browser-results.json'), JSON.stringify({ status: 'FAIL', results, error: e.message }, null, 2) + '\n'); process.exitCode = 1;
} finally { browser?.close(); stopServer(); }
process.exit(process.exitCode);
