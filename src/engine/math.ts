import { Point } from '../types';

/**
 * Seeded PRNG using SplitMix32 / Mulberry32
 */
export function createRNG(seed: number) {
  let s = (seed | 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Spring damping function for natural botanical bounce/pop
 */
export function springEase(t: number, k = 7, w = 15): number {
  if (t <= 0) return 0;
  return 1 - Math.exp(-t * k) * Math.cos(t * w);
}

/**
 * Cubic ease-out
 */
export function easeOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Cubic ease-in-out
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Cubic Bézier curve sampling
 */
export function bezierPoints(a: Point, b: Point, c: Point, d: Point, steps = 36): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * a[0] + 3 * uu * t * b[0] + 3 * u * tt * c[0] + ttt * d[0];
    const y = uuu * a[1] + 3 * uu * t * b[1] + 3 * u * tt * c[1] + ttt * d[1];
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Interpolate along sampled polyline at fraction u (0..1)
 * Returns point and tangent angle
 */
export function pointAndTangentAt(pts: Point[], u: number): [Point, number] {
  const n = pts.length;
  if (n < 2) return [pts[0] || [0, 0], 0];
  const idx = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
  const pPrev = pts[idx - 1];
  const pNext = pts[idx + 1];
  const angle = Math.atan2(pNext[1] - pPrev[1], pNext[0] - pPrev[0]);
  return [pts[idx], angle];
}

/**
 * Extracts a smooth fractional slice of a polyline between u0 and u1
 * with lerped boundary endpoints for ultra-smooth growth
 */
export function slicePolylineRange(pts: Point[], a: number, b: number): Point[] {
  const n = pts.length - 1;
  if (n < 1 || b <= a) return [];

  const ia = a * n;
  const ib = b * n;

  const lerp = (t: number): Point => {
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    const p1 = pts[i];
    const p2 = pts[i + 1];
    return [p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f];
  };

  const result: Point[] = [lerp(ia)];
  for (let i = Math.floor(ia) + 1; i < ib; i++) {
    result.push(pts[i]);
  }
  result.push(lerp(ib));
  return result.length >= 2 ? result : [];
}

/**
 * Hash noise function for deterministic perturbations
 */
export function hashNoise(n: number): number {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Organic jitter calculation for hand-drawn / alive feeling
 */
export function organicJitter(id: number, frame: number, amp: number): [number, number, number] {
  if (!amp) return [0, 0, 0];
  const f = frame * 0.05;
  const jx = (hashNoise(id * 1.37 + f * 7.13) * 2 - 1) * amp;
  const jy = (hashNoise(id * 2.71 + f * 3.11) * 2 - 1) * amp;
  const ja = (hashNoise(id * 5.3 + f * 1.7) * 2 - 1) * 0.035;
  return [jx, jy, ja];
}
