import { describe, it, expect } from "vitest";
import {
  courseHandicap,
  strokesReceived,
  gir,
  projectHole,
  grossTotal,
  netTotal,
  totalPutts,
  girCount,
  fairwayHitRate,
  scoreBreakdown,
  threePuttCount,
  courseRecords,
} from "@/lib/derivations";
import type { CourseHoleTemplate, HoleScore, ProjectedHole, Round } from "@/lib/types";

// ---------------------------------------------------------------------------
// courseHandicap
// ---------------------------------------------------------------------------
describe("courseHandicap", () => {
  it("applies WHS formula and rounds to nearest integer", () => {
    // 29.8 × (123/113) + (68.8 - 70) = 32.44 - 1.2 = 31.24 → 31
    expect(courseHandicap(29.8, 123, 68.8, 70)).toBe(31);
  });

  it("handles scratch (0.0 index)", () => {
    expect(courseHandicap(0, 113, 72, 72)).toBe(0);
  });

  it("handles plus handicap (negative index)", () => {
    // -2.0 × (113/113) + (72 - 72) = -2 → -2
    expect(courseHandicap(-2, 113, 72, 72)).toBe(-2);
  });

  it("rounds 0.5 up", () => {
    // produce a case that lands exactly on .5
    // 10 × (118/113) + (71.5 - 72) = 10.44 - 0.5 = 9.94 → 10
    expect(courseHandicap(10, 118, 71.5, 72)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// strokesReceived
// ---------------------------------------------------------------------------
describe("strokesReceived", () => {
  it("gives 0 strokes when course handicap is 0", () => {
    expect(strokesReceived(1, 0)).toBe(0);
    expect(strokesReceived(18, 0)).toBe(0);
  });

  it("gives 1 stroke on all holes when ch = 18", () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesReceived(si, 18)).toBe(1);
    }
  });

  it("gives 2 strokes on SI 1–12, 1 on SI 13–18 when ch = 30", () => {
    for (let si = 1; si <= 12; si++) {
      expect(strokesReceived(si, 30)).toBe(2);
    }
    for (let si = 13; si <= 18; si++) {
      expect(strokesReceived(si, 30)).toBe(1);
    }
  });

  it("gives 2 strokes on all holes when ch = 36", () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesReceived(si, 36)).toBe(2);
    }
  });

  it("strokes sum equals course handicap", () => {
    const ch = 31;
    const total = Array.from({ length: 18 }, (_, i) => strokesReceived(i + 1, ch))
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(ch);
  });

  it("returns 0 for negative ch", () => {
    expect(strokesReceived(1, -2)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// gir
// ---------------------------------------------------------------------------
describe("gir", () => {
  it("returns true when strokes to green <= par - 2", () => {
    expect(gir(4, 2, 4)).toBe(true);  // par, on in 2 on par 4
    expect(gir(3, 2, 4)).toBe(true);  // birdie, on in 1
    expect(gir(5, 2, 5)).toBe(true);  // par on par 5, on in 3
    expect(gir(2, 1, 3)).toBe(true);  // birdie on par 3, on in 1
  });

  it("returns false when strokes to green > par - 2", () => {
    expect(gir(5, 2, 4)).toBe(false); // bogey, on in 3
    expect(gir(6, 2, 5)).toBe(false); // double on par 5, on in 4
    expect(gir(3, 1, 3)).toBe(false); // bogey on par 3, on in 2
  });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const par4Template: CourseHoleTemplate = { hole: 1, si: 10, par: 4, yards: 350 };
const par3Template: CourseHoleTemplate = { hole: 7, si: 8, par: 3, yards: 165 };
const par5Template: CourseHoleTemplate = { hole: 2, si: 6, par: 5, yards: 500 };

const bogeyScore: HoleScore = { hole: 1, gross: 5, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null };
const parScore: HoleScore = { hole: 7, gross: 3, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null };

// ---------------------------------------------------------------------------
// projectHole
// ---------------------------------------------------------------------------
describe("projectHole", () => {
  it("calculates net and scoreVsPar with a handicap", () => {
    // ch = 31: SI 10 gets 2 strokes (10 <= 31%18=13 → extra stroke on top of base 1)
    const projected = projectHole(par4Template, bogeyScore, 31);
    expect(projected.strokesReceived).toBe(2);
    expect(projected.net).toBe(3); // 5 - 2
    expect(projected.scoreVsPar).toBe(1); // 5 - 4
    expect(projected.netVsPar).toBe(-1); // 3 - 4
  });

  it("returns null net fields when no handicap", () => {
    const projected = projectHole(par4Template, bogeyScore, null);
    expect(projected.strokesReceived).toBeNull();
    expect(projected.net).toBeNull();
    expect(projected.netVsPar).toBeNull();
    expect(projected.scoreVsPar).toBe(1);
  });

  it("merges template and score fields and derives gir", () => {
    const projected = projectHole(par4Template, bogeyScore, 31);
    expect(projected.par).toBe(4);
    expect(projected.yards).toBe(350);
    expect(projected.gross).toBe(5);
    expect(projected.putts).toBe(2);
    // gross(5) - putts(2) = 3 > par(4) - 2 = 2 → not GIR
    expect(projected.gir).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Aggregate functions
// ---------------------------------------------------------------------------
function makeProjected(
  template: CourseHoleTemplate,
  score: HoleScore,
  ch: number | null
): ProjectedHole {
  return projectHole(template, score, ch);
}

describe("grossTotal", () => {
  it("sums gross scores", () => {
    const holes = [
      makeProjected(par4Template, bogeyScore, 31),
      makeProjected(par3Template, parScore, 31),
    ];
    expect(grossTotal(holes)).toBe(8); // 5 + 3
  });
});

describe("netTotal", () => {
  it("sums net scores when handicap present", () => {
    const holes = [
      makeProjected(par4Template, { ...bogeyScore, gross: 5 }, 31),
      makeProjected(par3Template, { ...parScore, gross: 3 }, 31),
    ];
    // SI 10 ch 31: base=1, extra=13 → 2 strokes → net 3
    // SI 8  ch 31: base=1, extra=13 → 2 strokes → net 1
    expect(netTotal(holes)).toBe(4);
  });

  it("returns null when any hole has no handicap", () => {
    const holes = [
      makeProjected(par4Template, bogeyScore, 31),
      makeProjected(par3Template, parScore, null),
    ];
    expect(netTotal(holes)).toBeNull();
  });
});

describe("totalPutts", () => {
  it("sums putts across holes", () => {
    const holes = [
      makeProjected(par4Template, bogeyScore, null),
      makeProjected(par3Template, parScore, null),
    ];
    expect(totalPutts(holes)).toBe(4); // 2 + 2
  });
});

describe("girCount", () => {
  it("counts only GIR holes", () => {
    const holes = [
      makeProjected(par4Template, bogeyScore, null),   // gross(5)-putts(2)=3 > par(4)-2=2 → false
      makeProjected(par3Template, parScore, null),      // gross(3)-putts(2)=1 <= par(3)-2=1 → true
      makeProjected(par5Template, { hole: 2, gross: 5, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null }, null), // 3<=3 → true
    ];
    expect(girCount(holes)).toBe(2);
  });
});

describe("fairwayHitRate", () => {
  it("only counts par-4s and par-5s", () => {
    const holes = [
      makeProjected(par4Template, { ...bogeyScore, accuracy: "hit" }, null),
      makeProjected(par3Template, { ...parScore, accuracy: "left" }, null), // excluded
      makeProjected(par5Template, { hole: 2, gross: 6, putts: 2, accuracy: "right", teeClub: null, sandShots: null, penalties: null }, null),
    ];
    // 1 hit out of 2 driving holes
    expect(fairwayHitRate(holes)).toBe(0.5);
  });

  it("returns null when no par-4s or par-5s", () => {
    const holes = [
      makeProjected(par3Template, parScore, null),
    ];
    expect(fairwayHitRate(holes)).toBeNull();
  });

  it("returns 1.0 when all driving holes are hit", () => {
    const holes = [
      makeProjected(par4Template, { ...bogeyScore, accuracy: "hit" }, null),
      makeProjected(par5Template, { hole: 2, gross: 6, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null }, null),
    ];
    expect(fairwayHitRate(holes)).toBe(1);
  });
});

describe("scoreBreakdown", () => {
  it("bins holes by scoreVsPar", () => {
    const eagle: HoleScore = { hole: 1, gross: 2, putts: 1, accuracy: "hit", teeClub: null, sandShots: null, penalties: null };
    const birdie: HoleScore = { hole: 1, gross: 3, putts: 1, accuracy: "hit", teeClub: null, sandShots: null, penalties: null };
    const holes = [
      makeProjected(par4Template, eagle, null),          // -2 → parBetter
      makeProjected(par4Template, birdie, null),         // -1 → parBetter
      makeProjected(par4Template, bogeyScore, null),     // +1 → bogey
      makeProjected(par4Template, { ...bogeyScore, gross: 6 }, null), // +2 → double
      makeProjected(par4Template, { ...bogeyScore, gross: 7 }, null), // +3 → triple
      makeProjected(par4Template, { ...bogeyScore, gross: 8 }, null), // +4 → triple
    ];
    expect(scoreBreakdown(holes)).toEqual({ parBetter: 2, bogey: 1, double: 1, triple: 2 });
  });

  it("counts par as parBetter", () => {
    const parHole: HoleScore = { hole: 1, gross: 4, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null };
    const holes = [makeProjected(par4Template, parHole, null)];
    expect(scoreBreakdown(holes)).toEqual({ parBetter: 1, bogey: 0, double: 0, triple: 0 });
  });
});

describe("threePuttCount", () => {
  it("counts holes with 3 or more putts", () => {
    const two: HoleScore = { ...bogeyScore, putts: 2 };
    const three: HoleScore = { ...bogeyScore, putts: 3 };
    const four: HoleScore = { ...bogeyScore, putts: 4 };
    const holes = [
      makeProjected(par4Template, two, null),
      makeProjected(par4Template, three, null),
      makeProjected(par4Template, four, null),
    ];
    expect(threePuttCount(holes)).toBe(2);
  });

  it("returns 0 when no three-putts", () => {
    const holes = [makeProjected(par4Template, bogeyScore, null)]; // putts: 2
    expect(threePuttCount(holes)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// courseRecords
// ---------------------------------------------------------------------------
function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: "r1",
    userId: "u1",
    courseId: "c1",
    playedAt: "2026-06-01",
    handicapIndex: null,
    holes: [
      { hole: 1, gross: 5, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null },
      { hole: 2, gross: 4, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null },
    ],
    courseSnapshot: {
      name: "Humberstone Heights",
      tee: "Yellow",
      coursePar: 8,
      totalYards: 700,
      slopeRating: null,
      courseRating: null,
      holes: [
        { hole: 1, si: 1, par: 4, yards: 350 },
        { hole: 2, si: 2, par: 4, yards: 350 },
      ],
    },
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("courseRecords", () => {
  it("groups rounds by courseId, played-count included", () => {
    const r1 = makeRound({ id: "r1", playedAt: "2026-06-01" });
    const r2 = makeRound({ id: "r2", playedAt: "2026-06-14" });
    const records = courseRecords([r1, r2]);
    expect(records).toHaveLength(1);
    expect(records[0].roundsPlayed).toBe(2);
  });

  it("finds the lowest-gross round as the record", () => {
    const worse = makeRound({
      id: "r1",
      playedAt: "2026-06-01",
      holes: [
        { hole: 1, gross: 6, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null },
        { hole: 2, gross: 5, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null },
      ],
    });
    const better = makeRound({
      id: "r2",
      playedAt: "2026-06-14",
      holes: [
        { hole: 1, gross: 4, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null },
        { hole: 2, gross: 4, putts: 2, accuracy: "hit", teeClub: null, sandShots: null, penalties: null },
      ],
    });
    const records = courseRecords([worse, better]);
    expect(records[0].bestRoundId).toBe("r2");
    expect(records[0].bestGross).toBe(8);
    expect(records[0].bestGrossVsPar).toBe(0); // par 8
  });

  it("uses the most recently played round's snapshot for display fields", () => {
    const earlier = makeRound({
      id: "r1",
      playedAt: "2026-06-01",
      courseSnapshot: { ...makeRound().courseSnapshot, totalYards: 700 },
    });
    const later = makeRound({
      id: "r2",
      playedAt: "2026-06-14",
      courseSnapshot: { ...makeRound().courseSnapshot, totalYards: 720 },
    });
    const records = courseRecords([earlier, later]);
    expect(records[0].totalYards).toBe(720);
    expect(records[0].lastPlayedAt).toBe("2026-06-14");
  });

  it("ignores rounds with no courseId", () => {
    const noCourse = makeRound({ id: "r1", courseId: null });
    expect(courseRecords([noCourse])).toEqual([]);
  });

  it("sorts records alphabetically by course name", () => {
    const humberstone = makeRound({ id: "r1", courseId: "c1" });
    const waterstock = makeRound({
      id: "r2",
      courseId: "c2",
      courseSnapshot: { ...makeRound().courseSnapshot, name: "Waterstock Golf Club" },
    });
    const alpha = makeRound({
      id: "r3",
      courseId: "c3",
      courseSnapshot: { ...makeRound().courseSnapshot, name: "Alpha Golf Club" },
    });
    const records = courseRecords([humberstone, waterstock, alpha]);
    expect(records.map((r) => r.courseName)).toEqual([
      "Alpha Golf Club",
      "Humberstone Heights",
      "Waterstock Golf Club",
    ]);
  });
});
