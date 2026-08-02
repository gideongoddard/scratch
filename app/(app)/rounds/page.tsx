import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { projectHole, grossTotal, netTotal, girCount, totalPutts, courseHandicap } from "@/lib/derivations";
import type { Round } from "@/lib/types";
import { teeMarkerColor } from "@/lib/teeColor";
import styles from "./page.module.css";

function roundSummary(round: Round) {
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

  const projected = holes.map((score) => {
    const template = courseSnapshot.holes.find((h) => h.hole === score.hole)!;
    return projectHole(template, score, ch);
  });

  const gross = grossTotal(projected);

  return {
    gross,
    vsPar: gross - courseSnapshot.coursePar,
    net: netTotal(projected),
    gir: girCount(projected),
    putts: totalPutts(projected),
    holeCount: holes.length,
  };
}

function vsParColor(vsPar: number): string {
  return vsPar <= 0 ? "var(--good)" : "var(--bad)";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function RoundsPage() {
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const rounds = await repo.getRounds();

  return (
    <div>
      <h1 className={styles.headerTitle}>
        Rounds <span className={styles.headerSub}>· {rounds.length} logged</span>
      </h1>

      <main>
        {rounds.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No rounds yet</h2>
            <p className={styles.emptyBody}>
              Log your first round to start building trends and comparisons.
            </p>
            <Link href="/rounds/new" className={styles.logRoundLink}>
              Log a round
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {rounds.map((round) => {
              const { gross, vsPar, net, gir, putts, holeCount } = roundSummary(round);
              const teeColor = teeMarkerColor(round.courseSnapshot.tee);
              return (
                <li key={round.id}>
                  <Link href={`/rounds/${round.id}`} className={styles.roundCard}>
                    <div className={styles.roundInfo}>
                      <div className={styles.roundCourse}>
                        <span className={styles.roundCourseName}>{round.courseSnapshot.name}</span>
                        <span className={styles.roundTeeBadge}>
                          {teeColor && (
                            <span
                              className={styles.teeSwatch}
                              style={{ background: teeColor }}
                              aria-hidden
                            />
                          )}
                          {round.courseSnapshot.tee} tees
                        </span>
                      </div>
                      <div className={styles.roundDate}>
                        <span className={styles.roundDateValue}>{formatDate(round.playedAt)}</span>
                        <span className={styles.roundHoles}> · {holeCount} holes</span>
                      </div>
                    </div>

                    <div className={styles.grossTile}>
                      <span className={styles.grossLabel}>Gross</span>
                      <span className={`${styles.grossValue} tnum`}>{gross}</span>
                      <span className={`${styles.vsParChip} tnum`} style={{ color: vsParColor(vsPar) }}>
                        {vsPar >= 0 ? `+${vsPar}` : vsPar}
                      </span>
                    </div>

                    <div className={styles.statGrid}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Net</span>
                        <span className={`${styles.statValue} tnum`}>{net !== null ? net : "—"}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>GIR</span>
                        <span className={`${styles.statValue} tnum`}>
                          {gir}/{holeCount}
                        </span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Putts</span>
                        <span className={`${styles.statValue} tnum`}>{putts}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>HCP</span>
                        <span className={`${styles.statValue} tnum`}>
                          {round.handicapIndex !== null ? round.handicapIndex : "—"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.chevron} aria-hidden>
                      <svg width="15" height="15" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" fill="none">
                        <path d="M6 3 L11 8 L6 13" />
                      </svg>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
