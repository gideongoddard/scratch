import { describe, expect, it } from "vitest";
import { holeNumbersForMode, isHoleLogged, finishOption } from "@/lib/roundProgress";
import type { CourseHoleTemplate, CourseSnapshot, DraftHoleScore } from "@/lib/types";

function makeCourseHoles(count: 9 | 18): CourseHoleTemplate[] {
  return Array.from({ length: count }, (_, i) => ({
    hole: i + 1,
    si: i + 1,
    par: 4,
    yards: 350,
  }));
}

function makeSnapshot(count: 9 | 18): CourseSnapshot {
  const holes = makeCourseHoles(count);
  return {
    name: "Test Course",
    tee: "Yellow",
    coursePar: holes.reduce((s, h) => s + h.par, 0),
    totalYards: holes.length * 350,
    slopeRating: 120,
    courseRating: 68,
    holes,
  };
}

function loggedHole(hole: number): DraftHoleScore {
  return { hole, gross: 5, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null };
}

function untouchedHole(hole: number): DraftHoleScore {
  return { hole, gross: null, putts: null, accuracy: null, teeClub: null, sandShots: null, penalties: null };
}

describe("holeNumbersForMode", () => {
  it("returns all holes for a 9-hole course regardless of mode", () => {
    const holes = makeCourseHoles(9);
    expect(holeNumbersForMode(holes, "front")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(holeNumbersForMode(holes, "full")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("returns 1-9 for front, 10-18 for back, all 18 for full on an 18-hole course", () => {
    const holes = makeCourseHoles(18);
    expect(holeNumbersForMode(holes, "front")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(holeNumbersForMode(holes, "back")).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(holeNumbersForMode(holes, "full")).toHaveLength(18);
  });
});

describe("isHoleLogged", () => {
  it("is true only once both gross and putts are set", () => {
    expect(isHoleLogged(untouchedHole(1))).toBe(false);
    expect(isHoleLogged({ ...untouchedHole(1), gross: 5 })).toBe(false);
    expect(isHoleLogged(loggedHole(1))).toBe(true);
  });
});

describe("finishOption", () => {
  it("offers full once all 18 holes are logged", () => {
    const snapshot = makeSnapshot(18);
    const holes = Array.from({ length: 18 }, (_, i) => loggedHole(i + 1));
    expect(finishOption(snapshot, holes)).toEqual({ kind: "full" });
  });

  it("offers full once all 9 holes of a 9-hole round are logged", () => {
    const snapshot = makeSnapshot(9);
    const holes = Array.from({ length: 9 }, (_, i) => loggedHole(i + 1));
    expect(finishOption(snapshot, holes)).toEqual({ kind: "full" });
  });

  it("offers none for a partially logged 9-hole round", () => {
    const snapshot = makeSnapshot(9);
    const holes = [
      ...Array.from({ length: 5 }, (_, i) => loggedHole(i + 1)),
      ...Array.from({ length: 4 }, (_, i) => untouchedHole(i + 6)),
    ];
    expect(finishOption(snapshot, holes)).toEqual({ kind: "none" });
  });

  it("offers a front-9 save when exactly the front nine of an 18-hole round is logged", () => {
    const snapshot = makeSnapshot(18);
    const holes = [
      ...Array.from({ length: 9 }, (_, i) => loggedHole(i + 1)),
      ...Array.from({ length: 9 }, (_, i) => untouchedHole(i + 10)),
    ];
    expect(finishOption(snapshot, holes)).toEqual({ kind: "nine", side: "front" });
  });

  it("offers a back-9 save when exactly the back nine of an 18-hole round is logged", () => {
    const snapshot = makeSnapshot(18);
    const holes = [
      ...Array.from({ length: 9 }, (_, i) => untouchedHole(i + 1)),
      ...Array.from({ length: 9 }, (_, i) => loggedHole(i + 10)),
    ];
    expect(finishOption(snapshot, holes)).toEqual({ kind: "nine", side: "back" });
  });

  it("offers none when holes are logged on both nines but neither is complete", () => {
    const snapshot = makeSnapshot(18);
    const holes = [
      ...Array.from({ length: 5 }, (_, i) => loggedHole(i + 1)),
      ...Array.from({ length: 4 }, (_, i) => untouchedHole(i + 6)),
      ...Array.from({ length: 3 }, (_, i) => loggedHole(i + 10)),
      ...Array.from({ length: 6 }, (_, i) => untouchedHole(i + 13)),
    ];
    expect(finishOption(snapshot, holes)).toEqual({ kind: "none" });
  });
});
