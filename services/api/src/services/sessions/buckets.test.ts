import { test } from "node:test";
import assert from "node:assert/strict";
import { getTimeOfDayBucket, getDayOfWeek, getSessionLengthCategory } from "./buckets";

test("getTimeOfDayBucket maps hours to buckets", () => {
  assert.equal(getTimeOfDayBucket(0), "night");
  assert.equal(getTimeOfDayBucket(5), "night");
  assert.equal(getTimeOfDayBucket(6), "morning");
  assert.equal(getTimeOfDayBucket(11), "morning");
  assert.equal(getTimeOfDayBucket(12), "afternoon");
  assert.equal(getTimeOfDayBucket(17), "afternoon");
  assert.equal(getTimeOfDayBucket(18), "evening");
  assert.equal(getTimeOfDayBucket(23), "evening");
});

test("getDayOfWeek maps UTC weekday", () => {
  // 2024-01-07 is a Sunday (UTC); 01-08 Monday; 01-13 Saturday.
  assert.equal(getDayOfWeek(new Date("2024-01-07T00:00:00Z")), "sunday");
  assert.equal(getDayOfWeek(new Date("2024-01-08T12:00:00Z")), "monday");
  assert.equal(getDayOfWeek(new Date("2024-01-13T23:59:00Z")), "saturday");
});

test("getSessionLengthCategory buckets by match count", () => {
  assert.equal(getSessionLengthCategory(1), "short");
  assert.equal(getSessionLengthCategory(3), "short");
  assert.equal(getSessionLengthCategory(4), "medium");
  assert.equal(getSessionLengthCategory(7), "medium");
  assert.equal(getSessionLengthCategory(8), "long");
  assert.equal(getSessionLengthCategory(20), "long");
});
