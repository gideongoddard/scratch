"use client";

import { useState } from "react";
import { vsParBucketName, vsParColor } from "@/lib/scoreColor";
import styles from "./NumberPickerSheet.module.css";

export function NumberPickerSheet({
  title,
  min,
  max,
  value,
  par,
  onSelect,
  onClose,
}: {
  title: string;
  min: number;
  max: number;
  value: number | null;
  /** When set, tiles are tinted by score-vs-par (the gross sheet); omit for a plain count (putts). */
  par?: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}) {
  const [overflow, setOverflow] = useState("");
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{title}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.grid}>
          {numbers.map((n) => {
            const active = n === value;
            const color = par !== undefined ? vsParColor(n - par) : undefined;
            return (
              <button
                key={n}
                type="button"
                className={active ? styles.tileActive : styles.tile}
                style={active && color ? { background: color, color: "var(--accent-fg)" } : undefined}
                onClick={() => onSelect(n)}
              >
                <span className="tnum">{n}</span>
                {par !== undefined && (
                  <span className={styles.tileSub}>{vsParBucketName(n - par)}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.overflowRow}>
          <input
            type="number"
            min={max + 1}
            placeholder={`${max + 1}+`}
            className={styles.overflowInput}
            value={overflow}
            onChange={(e) => setOverflow(e.target.value)}
          />
          <button
            type="button"
            className={styles.overflowBtn}
            disabled={overflow === "" || Number(overflow) <= max}
            onClick={() => onSelect(Number(overflow))}
          >
            Use
          </button>
        </div>
      </div>
    </div>
  );
}
