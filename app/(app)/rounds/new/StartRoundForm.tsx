"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Course } from "@/lib/types";
import { holeNumbersForMode } from "@/lib/roundProgress";
import { startRound } from "./actions";
import styles from "./page.module.css";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StartRoundForm({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState("");
  const [playedAt, setPlayedAt] = useState(todayISO());
  const [handicapIndex, setHandicapIndex] = useState("");
  const [holesMode, setHolesMode] = useState<"front" | "back" | "full">("full");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const course = courses.find((c) => c.id === courseId) ?? null;
  const isNine = course ? course.holes.length === 9 : false;

  const holeNumbers = useMemo(() => {
    if (!course) return [];
    return holeNumbersForMode(course.holes, holesMode);
  }, [course, holesMode]);

  function selectCourse(id: string) {
    setCourseId(id);
    setHolesMode("full");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!course) {
      setError("Select a course.");
      return;
    }

    startTransition(async () => {
      const result = await startRound({
        courseId: course.id,
        playedAt,
        handicapIndex: handicapIndex === "" ? null : Number(handicapIndex),
        holeNumbers,
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.header}>
        <div>
          <Link href="/rounds" className={styles.backLink}>
            ← Rounds
          </Link>
          <h1 className={styles.headerTitle}>Log a round</h1>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Round details</h3>
        <p className={styles.cardSubtitle}>
          Pick the course and tee, confirm what you're playing, then log it hole by hole as you go.
        </p>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Course</span>
            <select
              className={styles.select}
              value={courseId}
              onChange={(e) => selectCourse(e.target.value)}
              required
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.tee}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Date played</span>
            <input
              type="date"
              className={styles.input}
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Handicap index</span>
            <input
              type="number"
              step="0.1"
              placeholder="Optional"
              className={styles.input}
              value={handicapIndex}
              onChange={(e) => setHandicapIndex(e.target.value)}
            />
          </label>

          {course && !isNine && (
            <div className={styles.field}>
              <span className={styles.label}>Holes played</span>
              <div className={styles.segmented}>
                {(
                  [
                    ["front", "Front 9"],
                    ["back", "Back 9"],
                    ["full", "Full 18"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={holesMode === value ? styles.segmentBtnActive : styles.segmentBtn}
                    onClick={() => setHolesMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.actions}>
        <Link href="/rounds" className={styles.cancelLink}>
          Cancel
        </Link>
        <button type="submit" className={styles.submitBtn} disabled={isPending || !course}>
          {isPending ? "Starting…" : "Start round"}
        </button>
      </div>
    </form>
  );
}
