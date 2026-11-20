// Ticket-04 §4: rebindable keys. Pure module (no DOM) so it is unit-tested.
export const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'dash', 'interact', 'pulse', 'pause'];
export const ACTION_LABELS = { left: 'Sang trái', right: 'Sang phải', up: 'Tiến lên', down: 'Lùi lại', jump: 'Nhảy', dash: 'Lướt', interact: 'Tương tác', pulse: 'Tỏa sáng', pause: 'Tạm dừng' };
export const DEFAULT_BINDINGS = Object.freeze({
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  jump: ['Space'], dash: ['ShiftLeft', 'ShiftRight'], interact: ['KeyE'], pulse: ['KeyQ'], pause: ['Escape', 'KeyP'],
});
export const defaultBindings = () => Object.fromEntries(ACTIONS.map(a => [a, [...DEFAULT_BINDINGS[a]]]));
export function keyLabel(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc' }[code] ?? code;
}
export const labelFor = codes => [...new Set(codes.map(keyLabel))].join(' / ');
/** Action that already owns `code`, other than `action`, or null. */
export const findConflict = (bindings, action, code) => ACTIONS.find(a => a !== action && bindings[a].includes(code)) ?? null;
/** Rebind `action` to exactly one key. Returns {ok, bindings, conflict?}; never changes bindings on conflict. */
export function rebind(bindings, action, code) {
  if (!ACTIONS.includes(action) || typeof code !== 'string' || !code) return { ok: false, bindings, error: 'invalid' };
  const conflict = findConflict(bindings, action, code);
  if (conflict) return { ok: false, bindings, conflict };
  return { ok: true, bindings: { ...bindings, [action]: [code] } };
}
/** Validate stored bindings; falls back to defaults for anything malformed or conflicting. */
export function sanitize(value) {
  const out = defaultBindings();
  if (!value || typeof value !== 'object') return out;
  const used = new Set();
  const candidate = {};
  for (const a of ACTIONS) {
    const list = value[a];
    candidate[a] = Array.isArray(list) && list.length && list.every(c => typeof c === 'string' && c) ? [...new Set(list)] : null;
  }
  if (ACTIONS.every(a => candidate[a])) {
    for (const a of ACTIONS) for (const c of candidate[a]) { if (used.has(c)) return out; used.add(c); }
    return candidate;
  }
  return out;
}
