"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Accuracy, Course, TeeClub } from "@/lib/types";
import { createRound } from "./actions";
import styles from "./page.module.css";

const ACCURACY_OPTIONS: { value: Accuracy; label: string }[] = [
  { value: "hit", label: "Hit" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "short", label: "Short" },
  { value: "long", label: "Long" },
];

const TEE_CLUB_OPTIONS: TeeClub[] = [
  "Driver", "3W", "4W", "5W", "Hybrid",
  "2i", "3i", "4i", "5i", "6i", "7i", "8i", "9i",
  "Pw", "Sw", "Lw", "Putter",
];

type HoleDraft = {
  gross: string;
  putts: string;
  accuracy: Accuracy;
  teeClub: TeeClub | "";
  sandShots: string;
  penalties: string;
};

function emptyDraft(): HoleDraft {
  return { gross: "", putts: "", accuracy: "hit", teeClub: "", sandShots: "", penalties: "" };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RoundForm({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState("");
  const [playedAt, setPlayedAt] = useState(todayISO());
  const [handicapIndex, setHandicapIndex] = useState("");
  const [holesMode, setHolesMode] = useState<"front" | "back" | "full">("full");
  const [drafts, setDrafts] = useState<Record<number, HoleDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const course = courses.find((c) => c.id === courseId) ?? null;
  const isNine = course ? course.holes.length === 9 : false;

  const playedHoles = useMemo(() => {
    if (!course) return [];
    const sorted = [...course.holes].sort((a, b) => a.hole - b.hole);
    if (isNine || holesMode === "full") return sorted;
    if (holesMode === "front") return sorted.filter((h) => h.hole <= 9);
    return sorted.filter((h) => h.hole >= 10);
  }, [course, holesMode, isNine]);

  function selectCourse(id: string) {
    setCourseId(id);
    setHolesMode("full");
    setDrafts({});
    setError(null);
  }

  function updateDraft(hole: number, patch: Partial<HoleDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [hole]: { ...(prev[hole] ?? emptyDraft()), ...patch },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!course) {
      setError("Select a course.");
      return;
    }

    const incomplete = playedHoles.some((template) => {
      const draft = drafts[template.hole];
      return !draft || draft.gross === "" || draft.putts === "";
    });
    if (incomplete) {
      setError("Enter gross and putts for every hole.");
      return;
    }

    const holes = playedHoles.map((template) => {
      const draft = drafts[template.hole]!;
      return {
        hole: template.hole,
        gross: Number(draft.gross),
        putts: Number(draft.putts),
        accuracy: draft.accuracy,
        teeClub: draft.teeClub === "" ? null : draft.teeClub,
        sandShots: draft.sandShots === "" ? null : Number(draft.sandShots),
        penalties: draft.penalties === "" ? null : Number(draft.penalties),
      };
    });

    startTransition(async () => {
      const result = await createRound({
        courseId: course.id,
        playedAt,
        handicapIndex: handicapIndex === "" ? null : Number(handicapIndex),
        holeNumbers: playedHoles.map((h) => h.hole),
        holes,
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
        <p className={styles.cardSubtitle}>Pick the course and tee, then confirm what was played.</p>

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

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Scorecard</h3>
        <p className={styles.cardSubtitle}>
          {course
            ? `${playedHoles.length} holes · par ${playedHoles.reduce((s, h) => s + h.par, 0)}`
            : "Select a course to enter hole scores."}
        </p>

        {course && (
          <div className={styles.tableScroll}>
            <div className={styles.tableGrid}>
              <div className={styles.tableHeadRow}>
                <span>Hole</span>
                <span>Par / SI / Yds</span>
                <span>Gross</span>
                <span>Putts</span>
                <span>Tee shot</span>
                <span>Club</span>
                <span>Sand</span>
                <span>Pen.</span>
              </div>
              {playedHoles.map((h) => {
                const draft = drafts[h.hole] ?? emptyDraft();
                return (
                  <div key={h.hole} className={styles.tableRow}>
                    <span className={`${styles.holeNum} tnum`}>{h.hole}</span>
                    <span className={`${styles.holeMeta} tnum`}>
                      {h.par} / {h.si} / {h.yards}
                    </span>
                    <input
                      type="number"
                      min={1}
                      className={styles.cellInput}
                      value={draft.gross}
                      onChange={(e) => updateDraft(h.hole, { gross: e.target.value })}
                      required
                    />
                    <input
                      type="number"
                      min={0}
                      className={styles.cellInput}
                      value={draft.putts}
                      onChange={(e) => updateDraft(h.hole, { putts: e.target.value })}
                      required
                    />
                    <select
                      className={styles.cellSelect}
                      value={draft.accuracy}
                      onChange={(e) => updateDraft(h.hole, { accuracy: e.target.value as Accuracy })}
                    >
                      {ACCURACY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.cellSelect}
                      value={draft.teeClub}
                      onChange={(e) => updateDraft(h.hole, { teeClub: e.target.value as TeeClub | "" })}
                    >
                      <option value="">—</option>
                      {TEE_CLUB_OPTIONS.map((club) => (
                        <option key={club} value={club}>
                          {club}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      placeholder="—"
                      className={styles.cellInput}
                      value={draft.sandShots}
                      onChange={(e) => updateDraft(h.hole, { sandShots: e.target.value })}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="—"
                      className={styles.cellInput}
                      value={draft.penalties}
                      onChange={(e) => updateDraft(h.hole, { penalties: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.actions}>
        <Link href="/rounds" className={styles.cancelLink}>
          Cancel
        </Link>
        <button type="submit" className={styles.submitBtn} disabled={isPending || !course}>
          {isPending ? "Saving…" : "Save round"}
        </button>
      </div>
    </form>
  );
}
