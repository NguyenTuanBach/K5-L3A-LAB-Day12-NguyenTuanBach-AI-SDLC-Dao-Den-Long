// Ticket-04 bench.json statistics from per-frame dt (ms). Pure functions.
export function benchStats(dts) {
  const n = dts.length;
  if (!n || dts.some(v => !Number.isFinite(v) || v <= 0)) throw new Error('dt list must contain positive finite numbers');
  const total = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = sorted.slice(n - k).reduce((a, b) => a + b, 0) / k;
  return { frames: n, avg_fps: 1000 * n / total, p1_low_fps: 1000 / worst, frame_ms_p95: sorted[Math.ceil(0.95 * n) - 1] };
}
