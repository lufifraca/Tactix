import { test } from "node:test";
import assert from "node:assert/strict";
import type { QuestCriteria } from "@tactix/shared";
import { evaluateQuest } from "./scoring";

const stats = (s: Record<string, number>) => ({ stats: s });
const approx = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b}`);

test("aggregate >= tracks progress toward a target", () => {
  const c: QuestCriteria = { type: "aggregate", metric: "kills", op: ">=", target: 10, mode: "ALL" };

  const under = evaluateQuest(c, [stats({ kills: 3 }), stats({ kills: 4 })]);
  assert.equal(under.current, 7);
  assert.equal(under.completed, false);
  approx(under.pct, 0.7);

  const met = evaluateQuest(c, [stats({ kills: 6 }), stats({ kills: 4 })]);
  assert.equal(met.current, 10);
  assert.equal(met.completed, true);
  assert.equal(met.pct, 1);

  const over = evaluateQuest(c, [stats({ kills: 20 })]);
  assert.equal(over.completed, true);
  assert.equal(over.pct, 1); // clamped
});

test("aggregate <= is satisfied while under the cap", () => {
  const c: QuestCriteria = { type: "aggregate", metric: "deaths", op: "<=", target: 5, mode: "ALL" };

  const under = evaluateQuest(c, [stats({ deaths: 3 })]);
  assert.equal(under.completed, true);
  approx(under.pct, 0.4); // (target - current) / target

  const over = evaluateQuest(c, [stats({ deaths: 8 })]);
  assert.equal(over.completed, false);
  assert.equal(over.pct, 0); // clamped at 0
});

test("aggregate uses derived metrics (matchesPlayed, firstEngagementTotal)", () => {
  const played: QuestCriteria = {
    type: "aggregate",
    metric: "matchesPlayed",
    op: ">=",
    target: 3,
    mode: "ALL",
  };
  assert.equal(evaluateQuest(played, [stats({}), stats({})]).completed, false);
  assert.equal(evaluateQuest(played, [stats({}), stats({}), stats({})]).completed, true);

  const firstEng: QuestCriteria = {
    type: "aggregate",
    metric: "firstEngagementTotal",
    op: ">=",
    target: 3,
    mode: "ALL",
  };
  const r = evaluateQuest(firstEng, [stats({ firstEngagementWins: 2, firstEngagementLosses: 1 })]);
  assert.equal(r.current, 3);
  assert.equal(r.completed, true);
});

test("rate respects minDenominator and divide-by-zero", () => {
  const c: QuestCriteria = {
    type: "rate",
    numerator: "kills",
    denominator: "deaths",
    op: ">=",
    target: 1,
    minDenominator: 5,
    mode: "ALL",
  };

  const ok = evaluateQuest(c, [stats({ kills: 10, deaths: 5 })]);
  assert.equal(ok.current, 2); // ratio
  assert.equal(ok.completed, true);

  const belowMinDen = evaluateQuest(c, [stats({ kills: 10, deaths: 2 })]);
  assert.equal(belowMinDen.completed, false); // denominator < minDenominator

  const zeroDen = evaluateQuest(c, [stats({ kills: 5, deaths: 0 })]);
  assert.equal(zeroDen.current, 0); // ratio falls back to 0
  assert.equal(zeroDen.completed, false);
});

test("perMatch counts qualifying matches against minMatches", () => {
  const c: QuestCriteria = {
    type: "perMatch",
    metric: "kills",
    op: ">=",
    target: 5,
    minMatches: 2,
    mode: "ALL",
  };

  const met = evaluateQuest(c, [stats({ kills: 6 }), stats({ kills: 5 }), stats({ kills: 2 })]);
  assert.equal(met.current, 2); // two matches with kills >= 5
  assert.equal(met.completed, true);
  assert.equal(met.pct, 1);

  const notMet = evaluateQuest(c, [stats({ kills: 6 }), stats({ kills: 2 })]);
  assert.equal(notMet.current, 1);
  assert.equal(notMet.completed, false);
  approx(notMet.pct, 0.5);
});
