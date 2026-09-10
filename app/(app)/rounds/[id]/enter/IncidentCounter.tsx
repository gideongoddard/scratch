"use client";

import styles from "./IncidentCounter.module.css";

export function IncidentCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  if (value === null) {
    return (
      <button type="button" className={styles.addTile} onClick={() => onChange(1)}>
        <span className={styles.plus} aria-hidden>
          +
        </span>
        {label}
      </button>
    );
  }

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => onChange(value <= 1 ? null : value - 1)}
        aria-label={`Fewer ${label.toLowerCase()}`}
      >
        −
      </button>
      <span className={styles.stepLabel}>
        <span className={`${styles.stepValue} tnum`}>{value}</span> {label}
      </span>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => onChange(value + 1)}
        aria-label={`More ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  );
}
