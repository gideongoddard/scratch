"use client";

import { useState } from "react";
import { NumberPickerSheet } from "./NumberPickerSheet";
import styles from "./PuttsChipRow.module.css";

const QUICK = [0, 1, 2, 3, 4];

export function PuttsChipRow({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const overflowValue = value !== null && !QUICK.includes(value) ? value : null;

  return (
    <>
      <div className={styles.row}>
        {QUICK.map((n) => (
          <button
            key={n}
            type="button"
            className={value === n ? styles.pillActive : styles.pill}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className={overflowValue !== null ? styles.pillActive : styles.pill}
          onClick={() => setSheetOpen(true)}
        >
          {overflowValue !== null ? overflowValue : "···"}
        </button>
      </div>
      {sheetOpen && (
        <NumberPickerSheet
          title="Putts"
          min={0}
          max={8}
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
