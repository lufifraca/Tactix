import { test } from "node:test";
import assert from "node:assert/strict";
import { isStranded, keptCountByGap, STRANDED_GAP_MS } from "./strandedGap";

const DAY = 24 * 60 * 60 * 1000;

test("isStranded: a null previous match is never stranded", () => {
  assert.equal(isStranded(null, Date.UTC(2026, 0, 1)), false);
});

test("isStranded: within a year is fine, beyond a year is stranded", () => {
  const t = Date.UTC(2026, 0, 1);
  assert.equal(isStranded(t, t - 364 * DAY), false);
  assert.equal(isStranded(t, t - 366 * DAY), true);
});

test("keptCountByGap: keeps the continuous cluster, drops the ancient outlier", () => {
  // newest→oldest: a dense recent cluster + one stray from years earlier
  const base = Date.UTC(2026, 4, 1);
  const starts = [0, 5 * DAY, 30 * DAY, 60 * DAY, 90 * DAY].map((d) => base - d);
  starts.push(Date.UTC(2022, 4, 26)); // the 2022 stray
  assert.equal(keptCountByGap(starts), 5);
});

test("keptCountByGap: a continuous history keeps everything", () => {
  const base = Date.UTC(2026, 4, 1);
  const starts = [0, 10 * DAY, 20 * DAY, 40 * DAY, 70 * DAY].map((d) => base - d);
  assert.equal(keptCountByGap(starts), starts.length);
});

test("keptCountByGap: honors a custom gap threshold", () => {
  const base = Date.UTC(2026, 4, 1);
  const starts = [base, base - 40 * DAY]; // 40-day gap
  assert.equal(keptCountByGap(starts, 30 * DAY), 1); // 40 > 30 → drop the older
  assert.equal(keptCountByGap(starts, 60 * DAY), 2); // 40 < 60 → keep both
});

test("keptCountByGap: empty input keeps nothing", () => {
  assert.equal(keptCountByGap([]), 0);
});

test("STRANDED_GAP_MS is one year", () => {
  assert.equal(STRANDED_GAP_MS, 365 * DAY);
});
