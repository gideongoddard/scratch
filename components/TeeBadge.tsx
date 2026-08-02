import { teeMarkerColor } from "@/lib/teeColor";
import styles from "./TeeBadge.module.css";

/** Tee pill with a dot in the tee's real marker colour — a recognition cue beside the "X tees" text. */
export function TeeBadge({ tee }: { tee: string }) {
  const color = teeMarkerColor(tee);
  return (
    <span className={styles.badge}>
      {color && <span className={styles.swatch} style={{ background: color }} aria-hidden />}
      {tee} tees
    </span>
  );
}
