import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { projectRound, grossTotal, netTotal, girCount, totalPutts } from "@/lib/derivations";
import { vsParColor } from "@/lib/scoreColor";
import { isHoleLogged } from "@/lib/roundProgress";
import type { DraftRound, Round } from "@/lib/types";
import { TeeBadge } from "@/components/TeeBadge";
import { Chip } from "@/components/Chip";
import styles from "./page.module.css";

function roundSummary(round: Round) {
  const projected = projectRound(round);
  const gross = grossTotal(projected);

  return {
    gross,
    vsPar: gross - round.courseSnapshot.coursePar,
    net: netTotal(projected),
    gir: girCount(projected),
    putts: totalPutts(projected),
    holeCount: round.holes.length,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function draftProgress(draft: DraftRound) {
  return {
    logged: draft.holes.filter(isHoleLogged).length,
    total: draft.holes.length,
  };
}

export default async function RoundsPage() {
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const [rounds, drafts] = await Promise.all([repo.getRounds(), repo.getDraftRounds()]);

  return (
    <div>
      <h1 className={styles.headerTitle}>Rounds</h1>
      <div className={styles.headerMeta}>
        <Chip>{rounds.length} logged</Chip>
      </div>

      <main>
        {drafts.length > 0 && (
          <div className={styles.draftSection}>
            <h2 className={styles.draftHeading}>In progress</h2>
            <ul className={styles.draftList}>
              {drafts.map((draft) => {
                const { logged, total } = draftProgress(draft);
                return (
                  <li key={draft.id}>
                    <Link href={`/rounds/${draft.id}/enter`} className={styles.draftCard}>
                      <div className={styles.roundInfo}>
                        <div className={styles.roundCourse}>
                          <span className={styles.roundCourseName}>{draft.courseSnapshot.name}</span>
                          <span className={styles.teeBadgeWrap}>
                            <TeeBadge tee={draft.courseSnapshot.tee} />
                          </span>
                        </div>
                        <div className={styles.roundDate}>
                          <span className={styles.roundDateValue}>{formatDate(draft.playedAt)}</span>
                        </div>
                      </div>
                      <span className={styles.draftProgress}>
                        {logged}/{total} holes logged
                      </span>
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
          </div>
        )}

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
                <li key={round.id}>
                  <Link href={`/rounds/${round.id}`} className={styles.roundCard}>
                    <div className={styles.roundInfo}>
                      <div className={styles.roundCourse}>
                        <span className={styles.roundCourseName}>{round.courseSnapshot.name}</span>
                        <span className={styles.teeBadgeWrap}>
                          <TeeBadge tee={round.courseSnapshot.tee} />
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
