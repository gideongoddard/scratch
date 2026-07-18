import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { projectHole, grossTotal, netTotal, girCount, totalPutts, courseHandicap } from "@/lib/derivations";
import type { Round } from "@/lib/types";
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
  if (vsPar <= 0) return "var(--good)";
  if (vsPar <= 2) return "var(--warn)";
  return "var(--bad)";
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
      <header className={styles.header}>
        <div>
          <div className={styles.headerEyebrow}>ROUNDS</div>
          <h1 className={styles.headerTitle}>
            Rounds{" "}
            <span className={styles.headerSub}>· {rounds.length} logged</span>
          </h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/rounds/new" className={styles.logRoundLink}>
            <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            Log a round
          </Link>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className={styles.signOutBtn}>
              Sign out
            </button>
          </form>
        </div>
      </header>

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
              return (
                <li key={round.id} className={styles.roundCard}>
                  <div className={styles.roundInfo}>
                    <div className={styles.roundCourse}>
                      {round.courseSnapshot.name}
                      <span className={styles.roundTeeBadge}>{round.courseSnapshot.tee} tees</span>
                    </div>
                    <div className={styles.roundDate}>
                      {formatDate(round.playedAt)}
                      <span className={styles.roundHoles}>· {holeCount} holes</span>
                    </div>
                  </div>

                  <div className={styles.grossTile}>
                    <span className={`${styles.grossValue} tnum`}>{gross}</span>
                    <span className={styles.grossLabel}>GROSS</span>
                    <span className={`${styles.vsParChip} tnum`} style={{ color: vsParColor(vsPar) }}>
                      {vsPar >= 0 ? `+${vsPar}` : vsPar}
                    </span>
                  </div>

                  <div className={styles.statGrid}>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>NET</span>
                      <span className={net !== null ? `${styles.statValue} tnum` : `${styles.statValueMuted} tnum`}>
                        {net !== null ? net : "—"}
                      </span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>GIR</span>
                      <span className={`${styles.statValue} tnum`}>
                        {gir}/{holeCount}
                      </span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>PUTTS</span>
                      <span className={`${styles.statValue} tnum`}>{putts}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>HCP</span>
                      <span className={round.handicapIndex !== null ? `${styles.statValue} tnum` : `${styles.statValueMuted} tnum`}>
                        {round.handicapIndex !== null ? round.handicapIndex : "—"}
                      </span>
                    </div>
                  </div>

                  <Link href={`/rounds/${round.id}`} className={styles.viewBtn} aria-label="View scorecard">
                    View
                    <svg width="12" height="12" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" fill="none" aria-hidden>
                      <path d="M6 3 L11 8 L6 13" />
                    </svg>
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
