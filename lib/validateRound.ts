import type { Accuracy, CourseSnapshot, HoleScore } from "@/lib/types";

const VALID_ACCURACY: Accuracy[] = ["hit", "left", "right", "short", "long"];

/**
 * Validates a round's snapshot + scores against the rules in CLAUDE.md.
 * courseHoleCount is the *full* course template's hole count (9 or 18) —
 * stroke indexes on a front/back-nine snapshot still reference the whole
 * course's numbering, so range-checking must use the template, not the subset.
 */
export function validateRoundInput(
  courseHoleCount: number,
  snapshot: CourseSnapshot,
  holes: HoleScore[]
): string[] {
  const errors: string[] = [];

  if (holes.length !== 9 && holes.length !== 18) {
    errors.push("A round must have 9 or 18 holes.");
  }

  const sis = snapshot.holes.map((h) => h.si);
  if (new Set(sis).size !== sis.length) {
    errors.push("Stroke indexes must be unique.");
  }
  if (sis.some((si) => si < 1 || si > courseHoleCount)) {
    errors.push(`Stroke indexes must be between 1 and ${courseHoleCount}.`);
  }

  const parSum = snapshot.holes.reduce((sum, h) => sum + h.par, 0);
  if (parSum !== snapshot.coursePar) {
    errors.push("Hole pars must sum to the recorded course par.");
  }

  const snapshotHoleNumbers = new Set(snapshot.holes.map((h) => h.hole));
  if (holes.length !== snapshotHoleNumbers.size) {
    errors.push("Every played hole must have exactly one score recorded.");
  }

  const seen = new Set<number>();
  for (const score of holes) {
    if (!snapshotHoleNumbers.has(score.hole)) {
      errors.push(`Hole ${score.hole} is not part of the played layout.`);
    }
    if (seen.has(score.hole)) {
      errors.push(`Hole ${score.hole} was scored more than once.`);
    }
    seen.add(score.hole);

    if (!Number.isFinite(score.gross) || score.gross < 1) {
      errors.push(`Hole ${score.hole}: gross score must be at least 1.`);
    }
    if (!Number.isFinite(score.putts) || score.putts < 0) {
      errors.push(`Hole ${score.hole}: putts cannot be negative.`);
    }
    if (!VALID_ACCURACY.includes(score.accuracy)) {
      errors.push(`Hole ${score.hole}: invalid accuracy value.`);
    }
  }

  return errors;
}
