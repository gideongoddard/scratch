"use client";

import { vsParColor } from "@/lib/scoreColor";
import { isHoleLogged } from "@/lib/roundProgress";
import type { CourseHoleTemplate, DraftHoleScore } from "@/lib/types";
import styles from "./HoleRail.module.css";

export function HoleRail({
  holes,
  scores,
  current,
  onSelect,
}: {
  holes: CourseHoleTemplate[];
  scores: DraftHoleScore[];
  current: number;
  onSelect: (hole: number) => void;
}) {
  const byHole = new Map(scores.map((s) => [s.hole, s]));
  const sorted = [...holes].sort((a, b) => a.hole - b.hole);

  return (
    <div className={styles.rail}>
      {sorted.map((h) => {
        const score = byHole.get(h.hole);
        const logged = score ? isHoleLogged(score) : false;
        const isCurrent = h.hole === current;
        const color = logged && score?.gross !== null ? vsParColor(score!.gross! - h.par) : undefined;

        return (
          <button
            key={h.hole}
            type="button"
            className={isCurrent ? styles.chipCurrent : logged ? styles.chipLogged : styles.chip}
            style={logged && !isCurrent && color ? { background: color } : undefined}
            onClick={() => onSelect(h.hole)}
          >
            <span className={styles.chipNum}>{h.hole}</span>
            <span className={`${styles.chipScore} tnum`}>{logged ? score!.gross : "·"}</span>
          </button>
        );
      })}
    </div>
  );
}
