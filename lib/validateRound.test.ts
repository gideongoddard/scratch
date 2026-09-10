import { describe, expect, it } from "vitest";
import { validateRoundInput, validateDraftHoles } from "@/lib/validateRound";
import type { CourseSnapshot, DraftHoleScore, HoleScore } from "@/lib/types";

function makeSnapshot(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  const holes = Array.from({ length: 9 }, (_, i) => ({
    hole: i + 1,
    si: i + 1,
    par: 4,
    yards: 350,
  }));
  return {
    name: "Test Course",
    tee: "Yellow",
    coursePar: 36,
    totalYards: 3150,
    slopeRating: 120,
    courseRating: 68,
    holes,
    ...overrides,
  };
}

function makeScores(holeNumbers: number[]): HoleScore[] {
  return holeNumbers.map((hole) => ({
    hole,
    gross: 5,
    putts: 2,
    accuracy: "hit" as const,
    teeClub: null,
    sandShots: null,
    penalties: null,
  }));
}

describe("validateRoundInput", () => {
  it("accepts a valid 9-hole round", () => {
    const snapshot = makeSnapshot();
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(validateRoundInput(9, snapshot, holes)).toEqual([]);
  });

  it("rejects a hole count that isn't 9 or 18", () => {
    const snapshot = makeSnapshot();
    const holes = makeScores([1, 2, 3]);
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("A round must have 9 or 18 holes.");
  });

  it("rejects duplicate stroke indexes", () => {
    const snapshot = makeSnapshot({
      holes: makeSnapshot().holes.map((h) => ({ ...h, si: 1 })),
    });
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("Stroke indexes must be unique.");
  });

  it("rejects stroke indexes outside the course's range", () => {
    const base = makeSnapshot();
    const snapshot = makeSnapshot({
      holes: [{ ...base.holes[0], si: 15 }, ...base.holes.slice(1)],
    });
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("Stroke indexes must be between 1 and 9.");
  });

  it("allows stroke indexes up to 18 when checked against an 18-hole course", () => {
    const base = makeSnapshot();
    // Front-nine snapshot, but hole 3's SI (13) belongs to the back nine of the full course.
    const snapshot = makeSnapshot({
      holes: [base.holes[0], base.holes[1], { ...base.holes[2], si: 13 }, ...base.holes.slice(3)],
    });
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(validateRoundInput(18, snapshot, holes)).toEqual([]);
  });

  it("rejects a coursePar that doesn't match the sum of hole pars", () => {
    const snapshot = makeSnapshot({ coursePar: 99 });
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("Hole pars must sum to the recorded course par.");
  });

  it("rejects a missing hole score", () => {
    const snapshot = makeSnapshot();
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8]);
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("Every played hole must have exactly one score recorded.");
  });

  it("rejects a score for a hole not in the snapshot", () => {
    const snapshot = makeSnapshot();
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 99]);
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("Hole 99 is not part of the played layout.");
  });

  it("rejects gross < 1 and negative putts", () => {
    const snapshot = makeSnapshot();
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    holes[0] = { ...holes[0], gross: 0 };
    holes[1] = { ...holes[1], putts: -1 };
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("Hole 1: gross score must be at least 1.");
    expect(errors).toContain("Hole 2: putts cannot be negative.");
  });

  it("rejects an invalid accuracy value", () => {
    const snapshot = makeSnapshot();
    const holes = makeScores([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // @ts-expect-error deliberately invalid
    holes[0] = { ...holes[0], accuracy: "centre" };
    const errors = validateRoundInput(9, snapshot, holes);
    expect(errors).toContain("Hole 1: invalid accuracy value.");
  });
});

function makeDraftHole(overrides: Partial<DraftHoleScore> = {}): DraftHoleScore {
  return {
    hole: 1,
    gross: null,
    putts: null,
    accuracy: null,
    teeClub: null,
    sandShots: null,
    penalties: null,
    ...overrides,
  };
}

describe("validateDraftHoles", () => {
  it("accepts a round with every hole untouched", () => {
    const holes = [1, 2, 3].map((hole) => makeDraftHole({ hole }));
    expect(validateDraftHoles(holes)).toEqual([]);
  });

  it("accepts a mix of untouched and logged holes", () => {
    const holes = [
      makeDraftHole({ hole: 1, gross: 4, putts: 2, accuracy: "hit" }),
      makeDraftHole({ hole: 2 }),
    ];
    expect(validateDraftHoles(holes)).toEqual([]);
  });

  it("rejects a duplicate hole number", () => {
    const holes = [makeDraftHole({ hole: 1 }), makeDraftHole({ hole: 1 })];
    expect(validateDraftHoles(holes)).toContain("Hole 1 was scored more than once.");
  });

  it("rejects gross below 1 when set", () => {
    const holes = [makeDraftHole({ hole: 1, gross: 0 })];
    expect(validateDraftHoles(holes)).toContain("Hole 1: gross score must be at least 1.");
  });

  it("rejects negative putts when set", () => {
    const holes = [makeDraftHole({ hole: 1, putts: -1 })];
    expect(validateDraftHoles(holes)).toContain("Hole 1: putts cannot be negative.");
  });

  it("rejects an invalid accuracy value when set", () => {
    const holes = [
      // @ts-expect-error deliberately invalid
      makeDraftHole({ hole: 1, accuracy: "centre" }),
    ];
    expect(validateDraftHoles(holes)).toContain("Hole 1: invalid accuracy value.");
  });
});
