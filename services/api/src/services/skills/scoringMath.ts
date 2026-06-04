/**
 * Pure scoring math — no IO/Prisma imports, so it is trivially unit-testable.
 * `computeCrossGameSkillScores` (in scoring.ts) composes these helpers.
 */

export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

export function safeNum(v: any): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function ratio(a: number, b: number, fallback = 0): number {
  if (b <= 0) return fallback;
  return a / b;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

/** Maps [good..great] -> [0.6..1.0]; below `good` scales down toward 0. */
export function score01HigherBetter(value: number, good: number, great: number): number {
  if (value <= 0) return 0;
  if (value <= good) return clamp(value / good, 0, 1) * 0.6;
  if (value >= great) return 1;
  return 0.6 + ((value - good) / (great - good)) * 0.4;
}

/** Lower values are better: <= great => 1, scaling down past `ok`. */
export function score01LowerBetter(value: number, ok: number, great: number): number {
  if (value <= great) return 1;
  if (value >= ok) return clamp(1 - (value - ok) / ok, 0, 1) * 0.6;
  return 0.6 + (1 - (value - great) / (ok - great)) * 0.4;
}
