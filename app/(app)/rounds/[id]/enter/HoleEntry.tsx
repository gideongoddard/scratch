"use client";

import { useState, useTransition } from "react";
import { TeeBadge } from "@/components/TeeBadge";
import { isHoleLogged, finishOption, type FinishOption } from "@/lib/roundProgress";
import type { Accuracy, DraftHoleScore, DraftRound, TeeClub } from "@/lib/types";
import { saveHoleScore, discardDraft } from "./actions";
import { HoleRail } from "./HoleRail";
import { ScoreTileGrid } from "./ScoreTileGrid";
import { PuttsChipRow } from "./PuttsChipRow";
import { TeeShotRow } from "./TeeShotRow";
import { IncidentCounter } from "./IncidentCounter";
import { FinishReview } from "./FinishReview";
import styles from "./HoleEntry.module.css";

const TEE_CLUB_OPTIONS: TeeClub[] = [
  "Driver", "3W", "4W", "5W", "Hybrid",
  "2i", "3i", "4i", "5i", "6i", "7i", "8i", "9i",
  "Pw", "Sw", "Lw", "Putter",
];

function orderedHoleNumbers(draft: DraftRound): number[] {
  return [...draft.courseSnapshot.holes].sort((a, b) => a.hole - b.hole).map((h) => h.hole);
}

function initialHole(draft: DraftRound): number {
  const scoreByHole = new Map(draft.holes.map((h) => [h.hole, h]));
  const ordered = orderedHoleNumbers(draft);
  const firstUnlogged = ordered.find((n) => {
    const score = scoreByHole.get(n);
    return !score || !isHoleLogged(score);
  });
  return firstUnlogged ?? ordered[ordered.length - 1];
}

function finishLabel(draft: DraftRound, opt: FinishOption): string {
  if (opt.kind === "nine") return opt.side === "front" ? "front 9" : "back 9";
  return draft.courseSnapshot.holes.length === 9 ? "9-hole round" : "18-hole round";
}

function finishHoleNumbers(draft: DraftRound, opt: FinishOption): Set<number> {
  if (opt.kind === "full") return new Set(draft.courseSnapshot.holes.map((h) => h.hole));
  if (opt.kind === "nine") {
    return new Set(
      draft.courseSnapshot.holes
        .filter((h) => (opt.side === "front" ? h.hole <= 9 : h.hole >= 10))
        .map((h) => h.hole)
    );
  }
  return new Set();
}

export function HoleEntry({ draft }: { draft: DraftRound }) {
  const [holes, setHoles] = useState<DraftHoleScore[]>(draft.holes);
  const [currentHole, setCurrentHole] = useState(() => initialHole(draft));
  const [editingFrom, setEditingFrom] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDiscarding, startDiscardTransition] = useTransition();

  const ordered = orderedHoleNumbers(draft);
  const idx = ordered.indexOf(currentHole);
  const currentTemplate = draft.courseSnapshot.holes.find((h) => h.hole === currentHole)!;
  const currentScore = holes.find((h) => h.hole === currentHole) ?? {
    hole: currentHole,
    gross: null,
    putts: null,
    accuracy: null,
    teeClub: null,
    sandShots: null,
    penalties: null,
  };
  const currentLogged = isHoleLogged(currentScore);
  const opt = finishOption(draft.courseSnapshot, holes);

  function updateHole(patch: Partial<DraftHoleScore>) {
    const next = holes.map((h) => (h.hole === currentHole ? { ...h, ...patch } : h));
    setHoles(next);
    startSaveTransition(async () => {
      const result = await saveHoleScore(draft.id, next);
      setError(result?.error ?? null);
    });
  }

  function setGross(n: number) {
    updateHole({ gross: n, accuracy: currentScore.accuracy ?? "hit" });
  }

  function goNext() {
    if (editingFrom !== null) {
      setCurrentHole(editingFrom);
      setEditingFrom(null);
      return;
    }
    if (idx < ordered.length - 1) setCurrentHole(ordered[idx + 1]);
  }

  function goPrev() {
    if (idx > 0) setCurrentHole(ordered[idx - 1]);
  }

  function jumpTo(hole: number) {
    if (hole === currentHole) return;
    const score = holes.find((h) => h.hole === hole);
    if (score && isHoleLogged(score) && editingFrom === null) {
      setEditingFrom(currentHole);
    }
    setCurrentHole(hole);
  }

  function clearHole() {
    updateHole({
      gross: null,
      putts: null,
      accuracy: null,
      teeClub: null,
      sandShots: null,
      penalties: null,
    });
  }

  function handleDiscard() {
    if (!window.confirm("Discard this round? This can't be undone.")) return;
    startDiscardTransition(async () => {
      await discardDraft(draft.id);
    });
  }

  if (showReview) {
    return (
      <FinishReview
        roundId={draft.id}
        playedAt={draft.playedAt}
        handicapIndex={draft.handicapIndex}
        snapshot={draft.courseSnapshot}
        holeNumbers={finishHoleNumbers(draft, opt)}
        draftHoles={holes}
        label={finishLabel(draft, opt)}
        onCancel={() => setShowReview(false)}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.courseInfo}>
          <span className={styles.courseName}>{draft.courseSnapshot.name}</span>
          <TeeBadge tee={draft.courseSnapshot.tee} />
        </div>
        <button
          type="button"
          className={styles.discardBtn}
          onClick={handleDiscard}
          disabled={isDiscarding}
        >
          Discard
        </button>
      </div>

      <HoleRail holes={draft.courseSnapshot.holes} scores={holes} current={currentHole} onSelect={jumpTo} />

      {editingFrom !== null && (
        <div className={styles.editingBanner}>
          <span>Editing hole {currentHole}</span>
          <button
            type="button"
            className={styles.editingBack}
            onClick={() => {
              setCurrentHole(editingFrom);
              setEditingFrom(null);
            }}
          >
            Back to hole {editingFrom}
          </button>
        </div>
      )}

      <div className={styles.holeHeader}>
        <h1 className={`${styles.holeNum} tnum`}>Hole {currentHole}</h1>
        <span className={styles.holeMeta}>
          PAR {currentTemplate.par} · SI {currentTemplate.si} · {currentTemplate.yards} YDS
        </span>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Score</h3>
        <ScoreTileGrid par={currentTemplate.par} value={currentScore.gross} onChange={setGross} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Putts</h3>
        <PuttsChipRow value={currentScore.putts} onChange={(n) => updateHole({ putts: n })} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Tee shot</h3>
        <TeeShotRow
          par={currentTemplate.par}
          value={currentScore.accuracy}
          onChange={(a: Accuracy) => updateHole({ accuracy: a })}
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Club off the tee</h3>
        <select
          className={styles.clubSelect}
          value={currentScore.teeClub ?? ""}
          onChange={(e) =>
            updateHole({ teeClub: e.target.value === "" ? null : (e.target.value as TeeClub) })
          }
        >
          <option value="">—</option>
          {TEE_CLUB_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </section>

      <div className={styles.incidentGrid}>
        <IncidentCounter
          label="Sand"
          value={currentScore.sandShots}
          onChange={(v) => updateHole({ sandShots: v })}
        />
        <IncidentCounter
          label="Penalty"
          value={currentScore.penalties}
          onChange={(v) => updateHole({ penalties: v })}
        />
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.navBar}>
        <button type="button" className={styles.navSecondary} onClick={goPrev} disabled={idx === 0}>
          ← Prev
        </button>
        {currentLogged && (
          <button type="button" className={styles.navGhost} onClick={clearHole}>
            Clear hole
          </button>
        )}
        {opt.kind !== "none" && (
          <button type="button" className={styles.navFinish} onClick={() => setShowReview(true)}>
            Finish
          </button>
        )}
        {(editingFrom !== null || idx < ordered.length - 1) && (
          <button
            type="button"
            className={styles.navPrimary}
            onClick={goNext}
            disabled={editingFrom === null && !currentLogged}
          >
            {editingFrom !== null ? `Back to hole ${editingFrom}` : "Next →"}
          </button>
        )}
      </div>

      {isSaving && <span className={styles.savingHint}>Saving…</span>}
    </div>
  );
}
