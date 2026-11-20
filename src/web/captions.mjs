// Ticket-04 §4: captions and visual indicators (shade arrow at screen edge, wind, last 10 s, low fuel).
export class Captions {
  constructor(listEl, arrowsEl) { this.listEl = listEl; this.arrowsEl = arrowsEl; this.items = []; this.arrows = new Map(); this.enabled = true; this.state = { wind: false, sec: -1, low: new Set() }; }
  reset() { this.items = []; for (const a of this.arrows.values()) a.el?.remove(); this.arrows.clear(); this.state = { wind: false, sec: -1, low: new Set() }; this.render(); }
  say(text, seconds = 4, key = null) {
    if (!this.enabled) return;
    const existing = key && this.items.find(i => i.key === key);
    if (existing) { existing.text = text; existing.left = seconds; } else { this.items.push({ text, left: seconds, key }); if (this.items.length > 3) this.items.shift(); }
    this.render();
  }
  track(id, seconds = 5) { if (this.enabled) this.arrows.set(id, { left: seconds, el: this.arrows.get(id)?.el }); }
  render() { this.listEl.innerHTML = ''; for (const i of this.items) { const d = document.createElement('div'); d.textContent = i.text; this.listEl.appendChild(d); } }
  /** locate(id) -> {x,y} in normalised device coordinates (behind camera already mirrored) or null. */
  update(dt, locate) {
    const before = this.items.length; for (const i of this.items) i.left -= dt; this.items = this.items.filter(i => i.left > 0);
    if (this.items.length !== before) this.render();
    for (const [id, a] of this.arrows) {
      a.left -= dt; const p = a.left > 0 && this.enabled ? locate(id) : null;
      if (!p) { a.el?.remove(); this.arrows.delete(id); continue; }
      if (!a.el) { a.el = document.createElement('div'); a.el.className = 'edge-arrow'; a.el.textContent = '➤'; this.arrowsEl.appendChild(a.el); }
      const k = 0.88 / Math.max(Math.abs(p.x), Math.abs(p.y), 1e-6), x = p.x * k, y = p.y * k;
      a.el.style.left = `${(x * 0.5 + 0.5) * 100}%`; a.el.style.top = `${(0.5 - y * 0.5) * 100}%`; a.el.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(-y, x)}rad)`;
    }
  }
  /** Reads simulation state each frame; says each warning once per occurrence. */
  watch(g, lowFuelUnits) {
    const s = this.state;
    if (g.wind.warning && !s.wind) this.say('Gió sắp thổi! Giữ vững bước chân.', 4);
    s.wind = g.wind.warning;
    const sec = Math.ceil(g.time_left_s);
    if (sec <= 10 && sec > 0 && sec !== s.sec) { s.sec = sec; this.say(`Còn ${sec} giây tới bình minh!`, 1.6, 'countdown'); }
    for (const l of g.lanterns) {
      const low = l.lit && l.fuelUnits < lowFuelUnits;
      if (low && !s.low.has(l.id)) { s.low.add(l.id); this.say(`Đèn ${l.id} sắp cạn dầu (${Math.floor(l.fuelUnits / 60)}/100)`, 4); }
      if (!low) s.low.delete(l.id);
    }
  }
}
