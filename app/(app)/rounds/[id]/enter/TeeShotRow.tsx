"use client";

import type { Accuracy } from "@/lib/types";
import styles from "./TeeShotRow.module.css";

const PAR3_OPTIONS: { value: Accuracy; label: string }[] = [
  { value: "hit", label: "Hit" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "short", label: "Short" },
  { value: "long", label: "Long" },
];

const OPEN_OPTIONS = PAR3_OPTIONS.filter((o) => o.value !== "short" && o.value !== "long");

export function TeeShotRow({
  par,
  value,
  onChange,
}: {
  par: number;
  value: Accuracy | null;
  onChange: (value: Accuracy) => void;
}) {
  const options = par === 3 ? PAR3_OPTIONS : OPEN_OPTIONS;
  return (
    <div className={styles.row}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? styles.pillActive : styles.pill}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
