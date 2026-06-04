import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRulesReport } from "./coach";

// Derive the snapshot shape from the function signature so we don't depend on
// the (unexported) interface.
type Snap = Parameters<typeof buildRulesReport>[0];

const base: Snap = {
  displayName: "Tester",
  totalMatches: 50,
  today: { matches: 0, wins: 0, losses: 0, winRate: null },
  currentLossStreak: 0,
  bestWinStreak: null,
  bestTime: null,
  bestTimeWinRate: null,
  worstTime: null,
  bestDay: null,
  optimalLength: null,
  tiltThreshold: null,
  isTilting: false,
  topSkill: null,
  weakSkill: null,
  games: ["VALORANT"],
};

const snap = (o: Partial<Snap> = {}): Snap => ({ ...base, ...o });

test("always returns a rules report with <=4 insights and string fields", () => {
  const r = buildRulesReport(snap());
  assert.equal(r.source, "rules");
  assert.ok(Array.isArray(r.insights) && r.insights.length <= 4);
  assert.equal(typeof r.headline, "string");
  assert.equal(typeof r.focus, "string");
});

test("tilt → warning insight and reset headline", () => {
  const r = buildRulesReport(snap({ isTilting: true, currentLossStreak: 3, tiltThreshold: 3 }));
  assert.equal(r.headline, "Time to reset and regroup.");
  assert.ok(r.insights.some((i) => i.tone === "warning"));
});

test("win streak → positive insight and heater headline", () => {
  const r = buildRulesReport(snap({ bestWinStreak: { game: "VALORANT", n: 4 } }));
  assert.equal(r.headline, "You're on a heater.");
  assert.ok(r.insights.some((i) => i.tone === "positive"));
});

test("strong day today → locked-in headline", () => {
  const r = buildRulesReport(snap({ today: { matches: 5, wins: 4, losses: 1, winRate: 0.8 } }));
  assert.equal(r.headline, "Locked in — keep it rolling.");
});

test("weak skill drives the focus recommendation", () => {
  const r = buildRulesReport(snap({
    topSkill: { domain: "MECHANICS", score: 80 },
    weakSkill: { domain: "TEAMWORK", score: 31 },
  }));
  assert.match(r.focus, /Teamwork/);
  assert.match(r.focus, /31/);
});

test("no data yet → 'Ready when you are.' and a play-more focus", () => {
  const r = buildRulesReport(snap());
  assert.equal(r.headline, "Ready when you are.");
  assert.match(r.focus, /Play a few more matches/);
});
