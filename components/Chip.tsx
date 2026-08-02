import styles from "./Chip.module.css";

/** Small muted pill for a single fact (a count, a format, a measurement). */
export function Chip({ children }: { children: React.ReactNode }) {
  return <span className={styles.chip}>{children}</span>;
}
