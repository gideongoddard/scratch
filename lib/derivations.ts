import type {
  CourseHoleTemplate,
  HoleScore,
  ProjectedHole,
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

export function strokesReceived(si: number, ch: number): number {
  if (ch <= 0) return 0;
  const base = Math.floor(ch / 18);
  const extra = ch % 18;
  return base + (si <= extra ? 1 : 0);
}

export function gir(gross: number, putts: number, par: number): boolean {
  return gross - putts <= par - 2;
}

export function projectHole(
  template: CourseHoleTemplate,
  score: HoleScore,
  ch: number | null
): ProjectedHole {
  const strokes = ch !== null ? strokesReceived(template.si, ch) : null;
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

export function grossTotal(holes: ProjectedHole[]): number {
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
