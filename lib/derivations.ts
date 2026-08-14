import type {
  CourseHoleTemplate,
  HoleScore,
  ProjectedHole,
  Round,
} from "@/lib/types";

export function courseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  coursePar: number
): number {
  return Math.round(
    handicapIndex * (slopeRating / 113) + (courseRating - coursePar)
  );
}

export function strokesReceived(si: number, ch: number, holeCount: number): number {
  if (ch <= 0) return 0;
  const base = Math.floor(ch / holeCount);
  const extra = ch % holeCount;
  return base + (si <= extra ? 1 : 0);
}

export function gir(gross: number, putts: number, par: number): boolean {
  return gross - putts <= par - 2;
}

export function projectHole(
  template: CourseHoleTemplate,
  score: HoleScore,
  ch: number | null,
  holeCount: number
): ProjectedHole {
  const strokes = ch !== null ? strokesReceived(template.si, ch, holeCount) : null;
  const net = strokes !== null ? score.gross - strokes : null;
  return {
    ...template,
    ...score,
    gir: gir(score.gross, score.putts, template.par),
    strokesReceived: strokes,
    net,
    scoreVsPar: score.gross - template.par,
    netVsPar: net !== null ? net - template.par : null,
  };
}

// Projects every hole a round played into a ProjectedHole (net, GIR, vs-par,
// etc.), computing the round's course handicap once from its snapshotted
// ratings and handicap index. The single place this logic should live —
// UI code should never re-derive ch or map holes through projectHole itself.
export function projectRound(round: Round): ProjectedHole[] {
  const { courseSnapshot, holes, handicapIndex } = round;
  const ch =
    handicapIndex !== null &&
    courseSnapshot.slopeRating !== null &&
    courseSnapshot.courseRating !== null
      ? courseHandicap(
          handicapIndex,
          courseSnapshot.slopeRating,
          courseSnapshot.courseRating,
          courseSnapshot.coursePar
        )
      : null;

  const templatesByHole = new Map(courseSnapshot.holes.map((h) => [h.hole, h]));
  const sorted = [...holes].sort((a, b) => a.hole - b.hole);
  return sorted.flatMap((score) => {
    const template = templatesByHole.get(score.hole);
    if (!template) {
      console.warn(
        `Round ${round.id}: hole ${score.hole} has no matching template in its snapshot — skipping.`
      );
      return [];
    }
    return [projectHole(template, score, ch, courseSnapshot.holes.length)];
  });
}

export function grossTotal(holes: { gross: number }[]): number {
  return holes.reduce((sum, h) => sum + h.gross, 0);
}

export function netTotal(holes: ProjectedHole[]): number | null {
  if (holes.some((h) => h.net === null)) return null;
  return holes.reduce((sum, h) => sum + h.net!, 0);
}

export function totalPutts(holes: ProjectedHole[]): number {
  return holes.reduce((sum, h) => sum + h.putts, 0);
}

export function girCount(holes: ProjectedHole[]): number {
  return holes.filter((h) => h.gir).length;
}

// Only counts par-4s and par-5s — tee shots on par-3s aren't fairway shots.
export function fairwayHitRate(holes: ProjectedHole[]): number | null {
  const drivingHoles = holes.filter((h) => h.par > 3);
  if (drivingHoles.length === 0) return null;
  return drivingHoles.filter((h) => h.accuracy === "hit").length / drivingHoles.length;
}

export type ScoreBreakdown = {
  parBetter: number;
  bogey: number;
  double: number;
  triple: number;
};

export function scoreBreakdown(holes: ProjectedHole[]): ScoreBreakdown {
  const counts: ScoreBreakdown = { parBetter: 0, bogey: 0, double: 0, triple: 0 };
  for (const h of holes) {
    const vs = h.scoreVsPar;
    if (vs <= 0) counts.parBetter++;
    else if (vs === 1) counts.bogey++;
    else if (vs === 2) counts.double++;
    else counts.triple++;
  }
  return counts;
}

export function threePuttCount(holes: ProjectedHole[]): number {
  return holes.filter((h) => h.putts >= 3).length;
}

export type CourseRecord = {
  courseId: string;
  courseName: string;
  tee: string;
  coursePar: number;
  totalYards: number;
  holeCount: number;
  roundsPlayed: number;
  bestGross: number;
  bestGrossVsPar: number;
  bestRoundId: string;
  lastPlayedAt: string;
};

// Groups rounds by course_id and surfaces the personal-best (lowest gross)
// round per course. Course display fields come from the most recently
// played round's snapshot — the frozen record of what was played, not the
// live course template, which may since have been re-rated.
export function courseRecords(rounds: Round[]): CourseRecord[] {
  const groups = new Map<string, Round[]>();
  for (const round of rounds) {
    if (!round.courseId) continue;
    const group = groups.get(round.courseId);
    if (group) group.push(round);
    else groups.set(round.courseId, [round]);
  }

  const records: CourseRecord[] = [];
  for (const [courseId, group] of groups) {
    let best = group[0];
    let bestGross = grossTotal(best.holes);
    let latest = group[0];

    for (const round of group) {
      const gross = grossTotal(round.holes);
      if (gross < bestGross) {
        bestGross = gross;
        best = round;
      }
      if (round.playedAt > latest.playedAt) latest = round;
    }

    const snapshot = latest.courseSnapshot;
    records.push({
      courseId,
      courseName: snapshot.name,
      tee: snapshot.tee,
      coursePar: snapshot.coursePar,
      totalYards: snapshot.totalYards,
      holeCount: snapshot.holes.length,
      roundsPlayed: group.length,
      bestGross,
      bestGrossVsPar: bestGross - best.courseSnapshot.coursePar,
      bestRoundId: best.id,
      lastPlayedAt: latest.playedAt,
    });
  }

  return records.sort((a, b) => a.courseName.localeCompare(b.courseName));
}
