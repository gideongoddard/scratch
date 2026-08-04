import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import {
  projectRound,
  grossTotal,
  netTotal,
  girCount,
  totalPutts,
  threePuttCount,
  fairwayHitRate,
} from "@/lib/derivations";
import type { ProjectedHole } from "@/lib/types";
import { vsParColor, vsParLabel } from "@/lib/scoreColor";
import { TeeBadge } from "@/components/TeeBadge";
import { Chip } from "@/components/Chip";
import { RoundChart } from "./RoundChart";
import styles from "./page.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ACCURACY_LABEL: Record<string, string> = {
  hit: "Hit",
  left: "Left",
  right: "Right",
  short: "Short",
  long: "Long",
};

function HoleRow({ hole }: { hole: ProjectedHole }) {
  return (
    <div className={styles.tableRow}>
      <span className={`${styles.holeNum} tnum`}>{hole.hole}</span>
      <span className={`${styles.holeMeta} tnum`}>
        {hole.par} / {hole.si} / {hole.yards}
      </span>
      <span className={`${styles.grossCell} tnum`}>{hole.gross}</span>
      <span
        className={`${styles.vsParCell} tnum`}
        style={{ color: vsParColor(hole.scoreVsPar) }}
      >
        {vsParLabel(hole.scoreVsPar)}
      </span>
      <span className="tnum">{hole.putts}</span>
      <span aria-hidden>
        <span
          className={styles.girDot}
          style={
            hole.gir
              ? {
                  background: "var(--c1)",
                  boxShadow: "0 0 0 1px var(--c1), 0 1px 4px oklch(0.64 0.122 196 / 0.5)",
                }
              : { background: "var(--sunken)", boxShadow: "inset 0 0 0 1px var(--border)" }
          }
        />
      </span>
      <span className={styles.accuracyCell}>{ACCURACY_LABEL[hole.accuracy]}</span>
      <span className={styles.clubCell}>{hole.teeClub ?? "—"}</span>
      <span className="tnum">{hole.sandShots ?? "—"}</span>
      <span className="tnum">{hole.penalties ?? "—"}</span>
      <span className={`${styles.netCell} tnum`}>{hole.net !== null ? hole.net : "—"}</span>
    </div>
  );
}

function SubtotalRow({ label, holes }: { label: string; holes: ProjectedHole[] }) {
  const gross = grossTotal(holes);
  const putts = totalPutts(holes);
  const gir = girCount(holes);
  const net = netTotal(holes);
  const par = holes.reduce((s, h) => s + h.par, 0);

  return (
    <div className={styles.subtotalRow}>
      <span className={styles.subtotalLabel}>{label}</span>
      <span className={`${styles.holeMeta} tnum`}>par {par}</span>
      <span className={`${styles.grossCell} tnum`}>{gross}</span>
      <span
        className={`${styles.vsParCell} tnum`}
        style={{ color: vsParColor(gross - par) }}
      >
        {vsParLabel(gross - par)}
      </span>
      <span className="tnum">{putts}</span>
      <span className="tnum">{gir}</span>
      <span />
      <span />
      <span />
      <span />
      <span className={`${styles.netCell} tnum`}>{net !== null ? net : "—"}</span>
    </div>
  );
}

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const round = await repo.getRound(id);

  if (!round) {
    notFound();
  }

  const { courseSnapshot, handicapIndex } = round;

  const projected = projectRound(round);

  const gross = grossTotal(projected);
  const vsPar = gross - courseSnapshot.coursePar;
  const net = netTotal(projected);
  const gir = girCount(projected);
  const putts = totalPutts(projected);
  const threePutts = threePuttCount(projected);
  const fairwayRate = fairwayHitRate(projected);
  const isEighteen = projected.length === 18;
  const front = isEighteen ? projected.filter((h) => h.hole <= 9) : [];
  const back = isEighteen ? projected.filter((h) => h.hole >= 10) : [];

  return (
    <div>
      <Link href="/rounds" className={styles.backLink}>
        ← Rounds
      </Link>

      <div className={styles.header}>
        <div>
          <div className={styles.courseRow}>
            <h1 className={styles.courseName}>{courseSnapshot.name}</h1>
            <TeeBadge tee={courseSnapshot.tee} />
          </div>
          <div className={styles.dateLine}>
            <span className={styles.dateValue}>{formatDate(round.playedAt)}</span>
            <Chip>{projected.length} holes</Chip>
            <Chip>Par {courseSnapshot.coursePar}</Chip>
          </div>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>GROSS</span>
          <span className={`${styles.summaryValue} tnum`}>{gross}</span>
          <span className={`${styles.summarySub} tnum`} style={{ color: vsParColor(vsPar) }}>
            {vsParLabel(vsPar)}
          </span>
        </div>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>NET</span>
          <span className={`${styles.summaryValue} tnum`}>{net !== null ? net : "—"}</span>
          {handicapIndex !== null && (
            <span className={styles.summarySub}>hcp {handicapIndex}</span>
          )}
        </div>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>GIR</span>
          <span className={`${styles.summaryValue} tnum`}>
            {gir}
            <span className={styles.summarySuffix}>/{projected.length}</span>
          </span>
        </div>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>PUTTS</span>
          <span className={`${styles.summaryValue} tnum`}>{putts}</span>
        </div>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>3-PUTTS</span>
          <span className={`${styles.summaryValue} tnum`}>{threePutts}</span>
        </div>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>FAIRWAYS</span>
          <span className={`${styles.summaryValue} tnum`}>
            {fairwayRate !== null ? Math.round(fairwayRate * 100) : "—"}
            <span className={styles.summarySuffix}>{fairwayRate !== null ? "%" : ""}</span>
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Hole-by-hole</h3>
        <p className={styles.cardSubtitle}>
          Strokes per hole against par — colour shows how each hole scored.
        </p>
        <RoundChart holes={projected} isEighteen={isEighteen} />
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Scorecard</h3>
        <p className={styles.cardSubtitle}>Full hole-by-hole detail.</p>

        <div className={styles.tableScroll}>
          <div className={styles.tableGrid}>
            <div className={styles.tableHeadRow}>
              <span>Hole</span>
              <span>Par / SI / Yds</span>
              <span>Gross</span>
              <span>+/−</span>
              <span>Putts</span>
              <span>GIR</span>
              <span>Tee shot</span>
              <span>Club</span>
              <span>Sand</span>
              <span>Pen.</span>
              <span>Net</span>
            </div>

            {isEighteen ? (
              <>
                {front.map((h) => (
                  <HoleRow key={h.hole} hole={h} />
                ))}
                <SubtotalRow label="OUT" holes={front} />
                {back.map((h) => (
                  <HoleRow key={h.hole} hole={h} />
                ))}
                <SubtotalRow label="IN" holes={back} />
              </>
            ) : (
              projected.map((h) => <HoleRow key={h.hole} hole={h} />)
            )}

            <SubtotalRow label="TOTAL" holes={projected} />
          </div>
        </div>
      </div>
    </div>
  );
}
