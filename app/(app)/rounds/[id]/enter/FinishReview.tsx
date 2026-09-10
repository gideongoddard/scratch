"use client";

import { useState, useTransition } from "react";
import { projectRound, grossTotal, netTotal, girCount, totalPutts } from "@/lib/derivations";
import { vsParColor, vsParLabel } from "@/lib/scoreColor";
import type { CourseSnapshot, DraftHoleScore, HoleScore, Round } from "@/lib/types";
import { finishRound } from "./actions";
import styles from "./FinishReview.module.css";

export function FinishReview({
  roundId,
  playedAt,
  handicapIndex,
  snapshot,
  holeNumbers,
  draftHoles,
  label,
  onCancel,
}: {
  roundId: string;
  playedAt: string;
  handicapIndex: number | null;
  snapshot: CourseSnapshot;
  holeNumbers: Set<number>;
  draftHoles: DraftHoleScore[];
  label: string;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subsetTemplate = snapshot.holes.filter((h) => holeNumbers.has(h.hole));
  const par = subsetTemplate.reduce((sum, h) => sum + h.par, 0);

  const holes: HoleScore[] = draftHoles
    .filter((h) => holeNumbers.has(h.hole))
    .map((h) => ({
      hole: h.hole,
      gross: h.gross ?? 0,
      putts: h.putts ?? 0,
      accuracy: h.accuracy ?? "hit",
      teeClub: h.teeClub,
      sandShots: h.sandShots,
      penalties: h.penalties,
    }));

  const previewRound: Round = {
    id: roundId,
    userId: "",
    courseId: null,
    playedAt,
    handicapIndex,
    status: "complete",
    holes,
    courseSnapshot: { ...snapshot, coursePar: par, holes: subsetTemplate },
    createdAt: "",
    updatedAt: "",
  };

  const projected = projectRound(previewRound);
  const gross = grossTotal(projected);
  const vsPar = gross - par;
  const net = netTotal(projected);
  const gir = girCount(projected);
  const putts = totalPutts(projected);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await finishRound(roundId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Save {label}?</h1>
      <p className={styles.subtitle}>{snapshot.name} · {projected.length} holes</p>

      <div className={styles.summaryRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Gross</span>
          <span className={`${styles.statValue} tnum`}>{gross}</span>
          <span className={`${styles.statSub} tnum`} style={{ color: vsParColor(vsPar) }}>
            {vsParLabel(vsPar)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Net</span>
          <span className={`${styles.statValue} tnum`}>{net !== null ? net : "—"}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>GIR</span>
          <span className={`${styles.statValue} tnum`}>
            {gir}/{projected.length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Putts</span>
          <span className={`${styles.statValue} tnum`}>{putts}</span>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel} disabled={isPending}>
          Keep playing
        </button>
        <button type="button" className={styles.primaryBtn} onClick={confirm} disabled={isPending}>
          {isPending ? "Saving…" : `Save ${label}`}
        </button>
      </div>
    </div>
  );
}
