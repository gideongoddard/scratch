"use client";

import {
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { ProjectedHole } from "@/lib/types";
import { vsParBucketName, vsParColor, vsParLabel } from "@/lib/scoreColor";
import styles from "./RoundChart.module.css";

type HoleDatum = {
  hole: number;
  par: number;
  gross: number;
  vsPar: number;
};

const LEGEND_ITEMS = [
  { vsPar: -2, label: "Eagle−" },
  { vsPar: -1, label: "Birdie" },
  { vsPar: 0, label: "Par" },
  { vsPar: 1, label: "Bogey" },
  { vsPar: 2, label: "Double" },
  { vsPar: 3, label: "Triple+" },
];

function isHoleDatum(value: unknown): value is HoleDatum {
  return (
    typeof value === "object" &&
    value !== null &&
    "hole" in value &&
    "par" in value &&
    "gross" in value &&
    "vsPar" in value
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!isHoleDatum(datum)) return null;

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>
        Hole {datum.hole} · Par {datum.par}
      </div>
      <div className={styles.tooltipRow}>
        <span>Gross</span>
        <strong className="tnum">{datum.gross}</strong>
      </div>
      <div className={styles.tooltipRow}>
        <span>{vsParBucketName(datum.vsPar)}</span>
        <strong className="tnum" style={{ color: vsParColor(datum.vsPar) }}>
          {vsParLabel(datum.vsPar)}
        </strong>
      </div>
    </div>
  );
}

export function RoundChart({
  holes,
  isEighteen,
}: {
  holes: ProjectedHole[];
  isEighteen: boolean;
}) {
  const data: HoleDatum[] = holes.map((h) => ({
    hole: h.hole,
    par: h.par,
    gross: h.gross,
    vsPar: h.scoreVsPar,
  }));

  const maxGross = Math.max(...data.map((d) => d.gross));

  return (
    <div>
      <div className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: vsParColor(item.vsPar) }} />
            {item.label}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={styles.legendLine} />
          Par
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
          <XAxis
            dataKey="hole"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, Math.max(maxGross + 1, 6)]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            width={30}
          />
          {isEighteen && (
            <ReferenceLine x={9.5} stroke="var(--border-strong)" strokeDasharray="3 3" />
          )}
          <Tooltip content={ChartTooltip} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="gross" name="Gross" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.hole} fill={vsParColor(d.vsPar)} />
            ))}
          </Bar>
          <Line
            type="linear"
            dataKey="par"
            name="Par"
            stroke="var(--fg-subtle)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: "var(--surface)", stroke: "var(--fg-subtle)", strokeWidth: 1.5 }}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
