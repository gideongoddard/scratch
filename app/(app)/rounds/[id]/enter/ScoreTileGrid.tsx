"use client";

import { useState } from "react";
import { vsParBucketName, vsParColor } from "@/lib/scoreColor";
import { NumberPickerSheet } from "./NumberPickerSheet";
import styles from "./ScoreTileGrid.module.css";

const OFFSETS = [-1, 0, 1, 2, 3, 4];

export function ScoreTileGrid({
  par,
  value,
  onChange,
}: {
  par: number;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const quickNumbers = new Set(OFFSETS.map((off) => Math.max(1, par + off)));

  return (
    <>
      <div className={styles.grid}>
        {OFFSETS.map((off) => {
          const n = Math.max(1, par + off);
          const active = value === n;
          const color = vsParColor(off);
          return (
            <button
              key={off}
              type="button"
              className={active ? styles.tileActive : styles.tile}
              style={active ? { background: color, color: "var(--accent-fg)" } : undefined}
              onClick={() => onChange(n)}
            >
              <span className={`${styles.tileNum} tnum`}>{n}</span>
              <span className={styles.tileLabel}>{vsParBucketName(off)}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={value !== null && !quickNumbers.has(value) ? styles.tileActive : styles.moreTile}
          onClick={() => setSheetOpen(true)}
        >
          {value !== null && !quickNumbers.has(value) ? (
            <>
              <span className={`${styles.tileNum} tnum`}>{value}</span>
              <span className={styles.tileLabel}>{vsParBucketName(value - par)}</span>
            </>
          ) : (
            "Any score"
          )}
        </button>
      </div>
      {sheetOpen && (
        <NumberPickerSheet
          title="Any score"
          min={1}
          max={12}
          par={par}
          value={value}
          onSelect={(n) => {
            onChange(n);
            setSheetOpen(false);
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
