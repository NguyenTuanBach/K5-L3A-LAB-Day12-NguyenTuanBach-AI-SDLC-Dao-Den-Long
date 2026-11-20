// Ticket-04 benchmark scene. Pure data + core flag; no renderer, DOM or wall clock.
import { createGame } from './simulation.mjs';
export const BENCH = { shades: 200, motes: 100, warmup_s: 3, orbit_radius: 30, orbit_height: 15, orbit_period_s: 15 };
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
function spiral(count, radius, rotation) {
  return Array.from({ length: count }, (_, i) => {
    const r = radius * Math.sqrt((i + 0.5) / count), a = rotation + i * GOLDEN;
    return [r * Math.cos(a), 0, r * Math.sin(a)];
  });
}
const round = v => Math.round(v * 1000) / 1000;
export function benchScenario(tuning, seed = 42) {
  const rotation = ((seed >>> 0) * 2654435761 % 360) * Math.PI / 180;
  const lit = [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2]];
  const free = spiral(300, 37, rotation).filter(p => lit.every(l => dist2(p, l) > tuning.safe_radius + 0.5));
  const picks = Array.from({ length: BENCH.shades }, (_, k) => free[Math.round(k * (free.length - 1) / (BENCH.shades - 1))]);
  return {
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, time_left_s: 3600,
    motes: spiral(BENCH.motes, 34, rotation + 1).map(p => p.map(round)),
    shades: picks.map((p, i) => ({ id: `S${i + 1}`, pos: p.map(round), state: 'wander', state_ticks_left: 0 })),
    lanterns: ['L1', 'L2', 'L3'].map(id => ({ id, lit: true, fuel: tuning.fuel_max })),
  };
}
export function createBenchGame(tuning, seed = 42) {
  const g = createGame(tuning, seed, benchScenario(tuning, seed), 1);
  g.bench = true;
  return g;
}
// Counter-clockwise seen from above (+Y looking down, +X right, -Z up on screen), starts at (30,15,0).
export function benchCamera(t) {
  const a = 2 * Math.PI * t / BENCH.orbit_period_s;
  return { position: [BENCH.orbit_radius * Math.cos(a), BENCH.orbit_height, 0 - BENCH.orbit_radius * Math.sin(a)], target: [0, 0, 0] };
}
