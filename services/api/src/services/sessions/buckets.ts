import type { TimeOfDayBucket, DayOfWeek, SessionLengthCategory } from "@tactix/shared";

/**
 * Pure bucketing helpers for session analytics — no IO, so unit-testable.
 */

export function getTimeOfDayBucket(hour: number): TimeOfDayBucket {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 24) return "evening";
  return "night"; // 0-6
}

export function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[date.getUTCDay()] as DayOfWeek;
}

export function getSessionLengthCategory(matchCount: number): SessionLengthCategory {
  if (matchCount <= 3) return "short";
  if (matchCount <= 7) return "medium";
  return "long";
}
