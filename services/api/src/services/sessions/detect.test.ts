import { test } from "node:test";
import assert from "node:assert/strict";
import { detectSessionsFromMatches, type MatchForSession } from "./detect";

function m(
  id: string,
  game: string,
  endedAtIso: string,
  result: string,
  durationSeconds = 600
): MatchForSession {
  return { id, game, startedAt: null, endedAt: new Date(endedAtIso), result, durationSeconds };
}

test("returns no sessions for an empty list", () => {
  assert.deepEqual(detectSessionsFromMatches([]), []);
});

test("groups matches within 30 minutes into one session", () => {
  const sessions = detectSessionsFromMatches([
    m("1", "VALORANT", "2024-01-01T10:00:00Z", "WIN"),
    m("2", "VALORANT", "2024-01-01T10:20:00Z", "LOSS"),
  ]);
  assert.equal(sessions.length, 1);
  const s = sessions[0];
  assert.equal(s.matches.length, 2);
  assert.equal(s.winCount, 1);
  assert.equal(s.lossCount, 1);
  assert.equal(s.drawCount, 0);
  assert.equal(s.totalDuration, 1200);
});

test("splits into two sessions when the gap exceeds 30 minutes", () => {
  const sessions = detectSessionsFromMatches([
    m("1", "VALORANT", "2024-01-01T10:00:00Z", "WIN"),
    m("2", "VALORANT", "2024-01-01T11:00:00Z", "WIN"),
  ]);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].matches.length, 1);
  assert.equal(sessions[1].matches.length, 1);
});

test("separates sessions by game even when interleaved in time", () => {
  const sessions = detectSessionsFromMatches([
    m("1", "VALORANT", "2024-01-01T10:00:00Z", "WIN"),
    m("2", "MARVEL_RIVALS", "2024-01-01T10:05:00Z", "LOSS"),
    m("3", "VALORANT", "2024-01-01T10:10:00Z", "WIN"),
  ]);
  assert.equal(sessions.length, 2);
  const valorant = sessions.find((s) => s.game === "VALORANT")!;
  assert.equal(valorant.matches.length, 2);
  assert.equal(valorant.winCount, 2);
  assert.equal(valorant.longestStreak, 2);
  assert.equal(valorant.streakType, "WIN");
});

test("tracks the longest streak and its type", () => {
  const sessions = detectSessionsFromMatches([
    m("1", "V", "2024-01-01T10:00:00Z", "WIN"),
    m("2", "V", "2024-01-01T10:05:00Z", "LOSS"),
    m("3", "V", "2024-01-01T10:10:00Z", "LOSS"),
    m("4", "V", "2024-01-01T10:15:00Z", "LOSS"),
    m("5", "V", "2024-01-01T10:20:00Z", "WIN"),
  ]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].longestStreak, 3);
  assert.equal(sessions[0].streakType, "LOSS");
});

test("draws reset the current streak", () => {
  const sessions = detectSessionsFromMatches([
    m("1", "V", "2024-01-01T10:00:00Z", "WIN"),
    m("2", "V", "2024-01-01T10:05:00Z", "DRAW"),
    m("3", "V", "2024-01-01T10:10:00Z", "WIN"),
  ]);
  assert.equal(sessions[0].drawCount, 1);
  assert.equal(sessions[0].winCount, 2);
  assert.equal(sessions[0].longestStreak, 1);
});
