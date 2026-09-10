import type { CourseHoleTemplate, CourseSnapshot, DraftHoleScore } from "@/lib/types";

export function holeNumbersForMode(
  courseHoles: CourseHoleTemplate[],
  mode: "front" | "back" | "full"
): number[] {
  const sorted = [...courseHoles].sort((a, b) => a.hole - b.hole);
  const isNine = sorted.length === 9;
  if (isNine || mode === "full") return sorted.map((h) => h.hole);
  if (mode === "front") return sorted.filter((h) => h.hole <= 9).map((h) => h.hole);
  return sorted.filter((h) => h.hole >= 10).map((h) => h.hole);
}

export function isHoleLogged(hole: DraftHoleScore): boolean {
  return hole.gross !== null && hole.putts !== null;
}

export type FinishOption =
  | { kind: "none" }
  | { kind: "full" }
  | { kind: "nine"; side: "front" | "back" };

export function finishOption(
  snapshot: CourseSnapshot,
  holes: DraftHoleScore[]
): FinishOption {
  const byHole = new Map(holes.map((h) => [h.hole, h]));
  const logged = (n: number) => {
    const h = byHole.get(n);
    return h != null && isHoleLogged(h);
  };
  const untouched = (n: number) => {
    const h = byHole.get(n);
    return h == null || (!isHoleLogged(h) && h.gross === null && h.putts === null);
  };

  if (snapshot.holes.length === 9) {
    return snapshot.holes.every((h) => logged(h.hole)) ? { kind: "full" } : { kind: "none" };
  }

  if (snapshot.holes.every((h) => logged(h.hole))) return { kind: "full" };

  const front = snapshot.holes.filter((h) => h.hole <= 9).map((h) => h.hole);
  const back = snapshot.holes.filter((h) => h.hole >= 10).map((h) => h.hole);

  if (front.length > 0 && front.every(logged) && back.every(untouched)) {
    return { kind: "nine", side: "front" };
  }
  if (back.length > 0 && back.every(logged) && front.every(untouched)) {
    return { kind: "nine", side: "back" };
  }

  return { kind: "none" };
}
