import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import {
  projectHole,
  grossTotal,
  totalPutts,
  girCount,
  fairwayHitRate,
  scoreBreakdown,
  threePuttCount,
  courseHandicap,
} from "@/lib/derivations";
import type { Round, ProjectedHole } from "@/lib/types";
import styles from "./page.module.css";

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

type RoundStats = {
  id: string;
  courseName: string;
  date: string;
  gross: number;
  coursePar: number;
  vsParSum: number;
  gir: number;
  holeCount: number;
  putts: number;
  threePutts: number;
  fairwayPct: number | null;
  girHoleIndices: number[];
  breakdown: { parBetter: number; bogey: number; double: number; triple: number };
};

// ---------------------------------------------------------------------------
// Sparkline helper (pure SVG points, same layout as design)
// ---------------------------------------------------------------------------

function sparkPoints(values: number[], min: number, max: number): string {
  const w = 120, h = 38, padL = 5, padR = 5, padT = 7, padB = 7;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const n = values.length;
  if (n === 0) return "";
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
      const y = padT + (1 - (v - min) / range) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// ---------------------------------------------------------------------------
// Per-round projection (null ch since all seeded rounds have no handicap)
// ---------------------------------------------------------------------------

function projectRound(round: Round): ProjectedHole[] {
  const { courseSnapshot, holes, handicapIndex } = round;
  const ch =
    handicapIndex !== null &&
    courseSnapshot.slopeRating !== null &&
    courseSnapshot.courseRating !== null
      ? courseHandicap(
          handicapIndex,
          courseSnapshot.slopeRating,
          courseSnapshot.courseRating,
          courseSnapshot.coursePar
        )
      : null;

  const sorted = [...holes].sort((a, b) => a.hole - b.hole);
  return sorted.map((score) => {
    const template = courseSnapshot.holes.find((h) => h.hole === score.hole)!;
    return projectHole(template, score, ch);
  });
}

function computeRoundStats(round: Round, index: number): RoundStats {
  const projected = projectRound(round);
  const gross = grossTotal(projected);
  const coursePar = round.courseSnapshot.coursePar;
  const rate = fairwayHitRate(projected);

  return {
    id: round.id,
    courseName: round.courseSnapshot.name,
    date: new Date(round.playedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    gross,
    coursePar,
    vsParSum: gross - coursePar,
    gir: girCount(projected),
    holeCount: projected.length,
    putts: totalPutts(projected),
    threePutts: threePuttCount(projected),
    fairwayPct: rate !== null ? Math.round(rate * 100) : null,
    girHoleIndices: projected.map((h, i) => (h.gir ? i : -1)).filter((i) => i >= 0),
    breakdown: scoreBreakdown(projected),
  };
}

// ---------------------------------------------------------------------------
// Delta chip helpers
// ---------------------------------------------------------------------------

function deltaChip(
  curr: number,
  prev: number,
  lowerIsBetter: boolean
): { text: string; color: string; bg: string } | null {
  const diff = curr - prev;
  if (diff === 0) return null;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const abs = Math.abs(diff);
  const text = improved ? `▼${abs}` : diff < 0 ? `−${abs}` : `+${abs}`;
  return {
    text,
    color: improved ? "var(--good)" : "var(--bad)",
    bg: improved ? "var(--good-bg)" : "var(--bad-bg)",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const rawRounds = await repo.getRounds();

  // Chronological order (oldest first) for trend charts
  const rounds = [...rawRounds].reverse();

  if (rounds.length === 0) {
    return <EmptyState />;
  }

  const stats = rounds.map((r, i) => computeRoundStats(r, i));
  const latest = stats[stats.length - 1];
  const prev = stats.length >= 2 ? stats[stats.length - 2] : null;
  const isFirst = stats.length === 1;
  // Deltas and sparklines only earn their place at ≥3 rounds — two points
  // imply a direction they haven't earned yet.
  const hasTrend = stats.length >= 3;

  // Header copy
  const headerTitle = isFirst
    ? `Round 1`
    : `${latest.holeCount}-hole rounds`;
  const headerCount = isFirst
    ? `${latest.courseName} · ${latest.holeCount} holes`
    : `${stats.length} logged`;

  // KPI data
  const vsParValues = stats.map((s) => s.vsParSum);
  const puttValues = stats.map((s) => s.putts);
  const threePuttValues = stats.map((s) => s.threePutts);
  const fairwayValues = stats.filter((s) => s.fairwayPct !== null).map((s) => s.fairwayPct!);

  const vsParDelta = hasTrend ? deltaChip(latest.vsParSum, prev!.vsParSum, true) : null;
  const puttsDelta = hasTrend ? deltaChip(latest.putts, prev!.putts, true) : null;
  const threePuttsDelta = hasTrend ? deltaChip(latest.threePutts, prev!.threePutts, true) : null;
  const girDelta = hasTrend ? deltaChip(latest.gir, prev!.gir, false) : null;
  const fairwayDelta =
    hasTrend && latest.fairwayPct !== null && prev!.fairwayPct !== null
      ? deltaChip(latest.fairwayPct, prev!.fairwayPct, false)
      : null;

  // Sparkline ranges (pad slightly beyond extremes)
  const vsParSpark = hasTrend
    ? sparkPoints(vsParValues, Math.min(...vsParValues) - 1, Math.max(...vsParValues) + 1)
    : null;
  const puttsSpark = hasTrend
    ? sparkPoints(puttValues, Math.min(...puttValues) - 1, Math.max(...puttValues) + 1)
    : null;
  const threePuttsSpark = hasTrend
    ? sparkPoints(
        threePuttValues,
        Math.max(0, Math.min(...threePuttValues) - 1),
        Math.max(...threePuttValues) + 1
      )
    : null;
  const fairwaySpark =
    hasTrend && fairwayValues.length >= 3
      ? sparkPoints(
          fairwayValues,
          Math.max(0, Math.min(...fairwayValues) - 5),
          Math.min(100, Math.max(...fairwayValues) + 5)
        )
      : null;

  // Fairway trend colour: last round vs first
  const fairwayColor =
    fairwayValues.length >= 2 && fairwayValues[fairwayValues.length - 1] < fairwayValues[0]
      ? "var(--bad)"
      : "var(--c1)";

  // Breakdown note
  const breakdownNote =
    stats.length === 1
      ? "Doubles dominate the card — the blow-up holes are where the strokes go."
      : "Build a picture of your score mix as more rounds come in.";

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerEyebrow}>DASHBOARD</div>
          <h1 className={styles.headerTitle}>
            {headerTitle}{" "}
            <span className={styles.headerSub}>· {headerCount}</span>
          </h1>
        </div>
      </div>

      {/* Section divider */}
      <div className={styles.sectionDivider}>
        <span className={styles.sectionLabel}>The numbers</span>
        <span className={styles.sectionRule} />
      </div>

      {/* KPI tiles */}
      <div className={styles.kpiRow}>
        {/* SCORING cluster */}
        <div className={`${styles.kpiCluster} ${styles.kpiScoringCluster}`}>
          <div className={styles.kpiClusterLabel}>SCORING</div>
          {/* Merged scoring tile: Gross headline + vs-par trend unit */}
          <div className={styles.scoringTile}>
            <div>
              <span className={styles.scoringTileGrossLabel}>Gross</span>
              <div className={`${styles.scoringTileGrossValue} tnum`}>{latest.gross}</div>
            </div>
            <div>
              <div className={styles.scoringTileDivider}>
                <div className={styles.scoringTileVsParGroup}>
                  <span className={styles.scoringTileVsParLabel}>vs par</span>
                  <div className={styles.scoringTileVsParRow}>
                    <span
                      className={`${styles.scoringTileVsParValue} tnum`}
                      style={{ color: vsParDelta ? vsParDelta.color : "var(--fg-subtle)" }}
                    >
                      {latest.vsParSum >= 0 ? `+${latest.vsParSum}` : latest.vsParSum}
                    </span>
                    {vsParDelta && (
                      <span
                        className={styles.scoringTileVsParDelta}
                        style={{ color: vsParDelta.color }}
                      >
                        {vsParDelta.text}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.scoringTileSparkSpacer} />
                {vsParSpark && (
                  <svg viewBox="0 0 120 38" style={{ width: 76, height: 30 }} aria-hidden>
                    <polyline
                      points={vsParSpark}
                      fill="none"
                      stroke={vsParDelta ? vsParDelta.color : "var(--fg-subtle)"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              {isFirst && (
                <div className={styles.scoringTileNote}>baseline · first round</div>
              )}
            </div>
          </div>
        </div>

        {/* BALL-STRIKING & PUTTING cluster */}
        <div className={`${styles.kpiCluster} ${styles.kpiComponentCluster}`}>
          <div className={styles.kpiClusterLabel}>BALL-STRIKING &amp; PUTTING</div>
          <div className={styles.kpiGridAuto}>
            {/* FAIRWAYS */}
            <div className={styles.kpiTile}>
              <div className={styles.kpiTileTop}>
                <span className={styles.kpiTileLabel}>FAIRWAYS</span>
                {fairwayDelta && (
                  <span
                    className={styles.kpiChip}
                    style={{ color: fairwayDelta.color, background: fairwayDelta.bg }}
                  >
                    {fairwayDelta.text}
                  </span>
                )}
              </div>
              <div className={styles.kpiTileBottom}>
                <span className={`${styles.kpiValue} tnum`}>
                  {latest.fairwayPct !== null ? latest.fairwayPct : "—"}
                  <span className={styles.kpiSuffix}>{latest.fairwayPct !== null ? "%" : ""}</span>
                </span>
                {fairwaySpark && (
                  <svg viewBox="0 0 120 38" className={styles.kpiSpark} aria-hidden>
                    <polyline
                      points={fairwaySpark}
                      fill="none"
                      stroke={fairwayColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* GIR */}
            <div className={styles.kpiTile}>
              <div className={styles.kpiTileTop}>
                <span className={styles.kpiTileLabel}>GIR</span>
                {girDelta && (
                  <span
                    className={styles.kpiChip}
                    style={{ color: girDelta.color, background: girDelta.bg }}
                  >
                    {girDelta.text}
                  </span>
                )}
              </div>
              <div className={styles.kpiTileBottom}>
                <span className={`${styles.kpiValue} tnum`}>
                  {latest.gir}
                  <span className={styles.kpiSuffix}>/{latest.holeCount}</span>
                </span>
                <div className={styles.girMiniGrid} aria-hidden>
                  {Array.from({ length: latest.holeCount }, (_, i) => (
                    <div
                      key={i}
                      className={styles.girDot}
                      style={
                        latest.girHoleIndices.includes(i)
                          ? {
                              background: "var(--c1)",
                              boxShadow:
                                "0 0 0 1px var(--c1), 0 1px 4px oklch(0.64 0.122 196 / 0.5)",
                            }
                          : {
                              background: "var(--sunken)",
                              boxShadow: "inset 0 0 0 1px var(--border)",
                            }
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* PUTTS */}
            <div className={styles.kpiTile}>
              <div className={styles.kpiTileTop}>
                <span className={styles.kpiTileLabel}>PUTTS</span>
                {puttsDelta && (
                  <span
                    className={styles.kpiChip}
                    style={{ color: puttsDelta.color, background: puttsDelta.bg }}
                  >
                    {puttsDelta.text}
                  </span>
                )}
              </div>
              <div className={styles.kpiTileBottom}>
                <span className={`${styles.kpiValue} tnum`}>{latest.putts}</span>
                {puttsSpark && (
                  <svg viewBox="0 0 120 38" className={styles.kpiSpark} aria-hidden>
                    <polyline
                      points={puttsSpark}
                      fill="none"
                      stroke="var(--c1)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              {isFirst && <div className={styles.kpiNote}>baseline</div>}
            </div>

            {/* 3-PUTTS */}
            <div className={styles.kpiTile}>
              <div className={styles.kpiTileTop}>
                <span className={styles.kpiTileLabel}>3-PUTTS</span>
                {threePuttsDelta && (
                  <span
                    className={styles.kpiChip}
                    style={{ color: threePuttsDelta.color, background: threePuttsDelta.bg }}
                  >
                    {threePuttsDelta.text}
                  </span>
                )}
              </div>
              <div className={styles.kpiTileBottom}>
                <span className={`${styles.kpiValue} tnum`}>{latest.threePutts}</span>
                {threePuttsSpark && (
                  <svg viewBox="0 0 120 38" className={styles.kpiSpark} aria-hidden>
                    <polyline
                      points={threePuttsSpark}
                      fill="none"
                      stroke="var(--c1)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              {isFirst && <div className={styles.kpiNote}>baseline</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Fairway accuracy + Greens hit */}
      <div className={styles.chartsRow}>
        {/* Fairway accuracy */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Fairway accuracy</h3>
          <p className={styles.cardSubtitle}>
            {isFirst
              ? "Your starting accuracy off the tee — the baseline to beat."
              : "Fairway hit rate per round off the tee (par-4s and par-5s only)."}
          </p>
          <div className={styles.fairwayList}>
            {stats.map((s) => {
              const pct = s.fairwayPct;
              if (pct === null) return null;
              const color = pct < 70 ? "var(--bad)" : "var(--c1)";
              return (
                <div key={s.id} className={styles.fairwayRow}>
                  <div className={styles.fairwayMeta}>
                    <span className={styles.fairwayMetaLabel}>{s.date} · {s.courseName}</span>
                    <span
                      className={styles.fairwayMetaPct}
                      style={{ color }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className={styles.fairwayTrack}>
                    <div
                      className={styles.fairwayFill}
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Greens hit */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Greens hit</h3>
          <p className={styles.cardSubtitle}>Each dot a hole · filled = green hit.</p>
          <div className={styles.girList}>
            {stats.map((s) => (
              <div key={s.id} className={styles.girRow}>
                <div className={styles.girMeta}>
                  <span className={styles.girMetaLabel}>{s.date} · {s.courseName}</span>
                  <span className={styles.girMetaCount}>
                    {s.gir}
                    <span className={styles.girMetaCountDenom}>/{s.holeCount}</span>
                  </span>
                </div>
                <div className={styles.girDotGrid} aria-hidden>
                  {Array.from({ length: s.holeCount }, (_, i) => (
                    <div
                      key={i}
                      className={
                        s.girHoleIndices.includes(i)
                          ? styles.girDotHit
                          : styles.girDotMiss
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className={styles.breakdownCard}>
        <div className={styles.breakdownHeader}>
          <h3 className={styles.breakdownTitle}>
            Score breakdown{" "}
            <span className={styles.breakdownTitleSub}>
              · holes per round by score-to-par
            </span>
          </h3>
          <div className={styles.legend}>
            {(
              [
                ["var(--s-par)", "par−"],
                ["var(--s-bogey)", "bogey"],
                ["var(--s-double)", "double"],
                ["var(--s-triple)", "triple+"],
              ] as const
            ).map(([color, label]) => (
              <span key={label} className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.breakdownRows}>
          {stats.map((s) => {
            const total = s.holeCount;
            const segs = [
              { key: "parBetter", color: "var(--s-par)", count: s.breakdown.parBetter },
              { key: "bogey", color: "var(--s-bogey)", count: s.breakdown.bogey },
              { key: "double", color: "var(--s-double)", count: s.breakdown.double },
              { key: "triple", color: "var(--s-triple)", count: s.breakdown.triple },
            ].filter((seg) => seg.count > 0);

            return (
              <div key={s.id} className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>{s.date}</span>
                <div className={styles.breakdownBar}>
                  {segs.map((seg) => (
                    <div
                      key={seg.key}
                      className={styles.breakdownSeg}
                      style={{
                        width: `${((seg.count / total) * 100).toFixed(2)}%`,
                        background: seg.color,
                      }}
                    >
                      <span className={styles.breakdownSegCount}>{seg.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className={styles.breakdownNote}>{breakdownNote}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <svg width="28" height="28" viewBox="0 0 16 16" aria-hidden>
          <circle cx="8" cy="8" r="2.4" fill="var(--accent)" />
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="var(--accent)"
            strokeOpacity="0.4"
            strokeWidth="1.3"
            fill="none"
          />
        </svg>
      </div>
      <div>
        <h1 className={styles.emptyTitle}>No rounds yet</h1>
        <p className={styles.emptyBody}>
          Log your first round to start tracking. Trends, comparisons and your
          first coaching read unlock as soon as a round is in.
        </p>
      </div>
      <div className={styles.emptyActions}>
        <a href="/rounds/new" className={styles.emptyActionPrimary}>
          <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Log a round
        </a>
        <a href="#" className={styles.emptyActionSecondary}>
          Create a course
        </a>
      </div>
    </div>
  );
}
