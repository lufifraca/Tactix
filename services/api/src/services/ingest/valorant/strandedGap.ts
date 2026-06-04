/**
 * "Stranded outlier" detection for Valorant history.
 *
 * Henrik occasionally returns a single ancient match (e.g. an account's very
 * first game years ago) far below the player's continuous history. Once a time
 * gap this large appears in a newest→oldest sequence, everything older is
 * treated as stranded pre-tracking history and dropped.
 */
export const STRANDED_GAP_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

/** In a newest→oldest walk, is `curStartMs` stranded behind the previous kept match? */
export function isStranded(
  prevStartMs: number | null,
  curStartMs: number,
  gapMs: number = STRANDED_GAP_MS
): boolean {
  return prevStartMs != null && prevStartMs - curStartMs > gapMs;
}

/**
 * Given match start times sorted newest→oldest, return how many to keep before
 * the first stranded gap (everything from that gap onward is excluded).
 */
export function keptCountByGap(startsDescMs: number[], gapMs: number = STRANDED_GAP_MS): number {
  let kept = 0;
  let prev: number | null = null;
  for (const s of startsDescMs) {
    if (isStranded(prev, s, gapMs)) break;
    prev = s;
    kept++;
  }
  return kept;
}
