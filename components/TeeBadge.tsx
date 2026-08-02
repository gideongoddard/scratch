import { teeMarkerColor } from "@/lib/teeColor";
import { Chip } from "./Chip";
import styles from "./TeeBadge.module.css";

/** Tee pill with a dot in the tee's real marker colour — a recognition cue beside the "X tees" text. */
export function TeeBadge({ tee }: { tee: string }) {
  const color = teeMarkerColor(tee);
  return (
    <Chip>
      {color && <span className={styles.swatch} style={{ background: color }} aria-hidden />}
      {tee} tees
    </Chip>
  );
}
