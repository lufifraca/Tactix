import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  safeNum,
  ratio,
  mean,
  stddev,
  score01HigherBetter,
  score01LowerBetter,
} from "./scoringMath";

const approx = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b}`);

test("clamp bounds values", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test("safeNum coerces non-finite/non-number to 0", () => {
  assert.equal(safeNum(3), 3);
  assert.equal(safeNum(0), 0);
  assert.equal(safeNum("7" as any), 0);
  assert.equal(safeNum(NaN), 0);
  assert.equal(safeNum(Infinity), 0);
  assert.equal(safeNum(undefined), 0);
  assert.equal(safeNum(null), 0);
});

test("ratio divides, with fallback when denominator <= 0", () => {
  assert.equal(ratio(10, 2), 5);
  assert.equal(ratio(5, 0), 0); // default fallback
  assert.equal(ratio(5, 0, 1), 1); // custom fallback
  assert.equal(ratio(5, -3, 9), 9); // negative denominator uses fallback
});

test("mean handles empty and non-empty arrays", () => {
  assert.equal(mean([]), 0);
  assert.equal(mean([2, 4]), 3);
  approx(mean([1, 2, 3]), 2);
});

test("stddev returns 0 for fewer than 2 elements", () => {
  assert.equal(stddev([]), 0);
  assert.equal(stddev([5]), 0);
  assert.equal(stddev([3, 3, 3]), 0);
  approx(stddev([2, 4]), 1); // population stddev: sqrt(mean([1,1])) = 1
});

test("score01HigherBetter boundaries", () => {
  assert.equal(score01HigherBetter(0, 1, 2), 0); // <= 0
  assert.equal(score01HigherBetter(-5, 1, 2), 0);
  approx(score01HigherBetter(0.5, 1, 2), 0.3); // value/good * 0.6
  approx(score01HigherBetter(1, 1, 2), 0.6); // at good
  approx(score01HigherBetter(1.5, 1, 2), 0.8); // midpoint good..great
  assert.equal(score01HigherBetter(2, 1, 2), 1); // at great
  assert.equal(score01HigherBetter(3, 1, 2), 1); // beyond great
});

test("score01LowerBetter boundaries", () => {
  assert.equal(score01LowerBetter(1, 10, 2), 1); // <= great
  assert.equal(score01LowerBetter(2, 10, 2), 1); // at great
  approx(score01LowerBetter(6, 10, 2), 0.8); // between great and ok
  approx(score01LowerBetter(10, 10, 2), 0.6); // at ok
  approx(score01LowerBetter(15, 10, 2), 0.3); // past ok
  assert.equal(score01LowerBetter(20, 10, 2), 0); // double ok -> 0
});
