import { useMemo, useState } from 'react';
import type { LeagueData, CumulativeLuckEntry } from '../../types';
import { luckRankToColor } from '../../utils/calculations';
import styles from './LuckTrendChart.module.css';

interface Props {
  data: LeagueData;
  entries: CumulativeLuckEntry[];
  gwA: number;
  gwB: number;
}

const W = 640;
const H = 340;
const PAD = { top: 20, right: 120, bottom: 48, left: 52 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

export function LuckTrendChart({ data, entries, gwA, gwB }: Props) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  const teamMap = useMemo(
    () => Object.fromEntries(data.teams.map((t) => [t.id, t])),
    [data],
  );

  const total = entries.length;

  // Build per-team running totals: { teamId -> { gw -> cumulativeTotal } }
  const teamTotals = useMemo(() => {
    return entries.map((entry) => {
      const gwPoints: Record<number, number> = {};
      let running = 0;
      for (let gw = gwA; gw <= gwB; gw++) {
        const gwEntry = entry.gameweeks.find((g) => g.gw === gw);
        if (gwEntry) running += gwEntry.opponentFormRank;
        gwPoints[gw] = running;
      }
      return { teamId: entry.teamId, luckRank: entry.luckRank, gwPoints };
    });
  }, [entries, gwA, gwB]);

  const gwCount = gwB - gwA + 1;

  if (gwCount < 2 || entries.length === 0) {
    return (
      <div className={styles.empty}>
        Select at least 2 gameweeks to display the trend chart.
      </div>
    );
  }

  // Find max cumulative value for y-axis
  const maxVal = Math.max(
    ...teamTotals.flatMap((t) => Object.values(t.gwPoints)),
    1,
  );

  const xScale = (gw: number) => PAD.left + ((gw - gwA) / (gwCount - 1)) * PW;
  const yScale = (v: number) => PAD.top + PH - (v / maxVal) * PH;

  const gwTicks = Array.from({ length: gwCount }, (_, i) => gwA + i).filter(
    (_, i) => gwCount <= 10 || i % Math.ceil(gwCount / 10) === 0 || gwA + i === gwB,
  );

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) =>
    Math.round((maxVal / (yTickCount - 1)) * i),
  );

  // Top 3 luckiest and bottom 3 unluckiest are highlighted; others are faint
  const highlightedIds = new Set([
    ...teamTotals.filter((t) => t.luckRank <= 3).map((t) => t.teamId),
    ...teamTotals.filter((t) => t.luckRank >= total - 2).map((t) => t.teamId),
  ]);

  return (
    <div className={styles.wrapper}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label="Cumulative luck trend chart"
        onMouseLeave={() => setHoveredTeam(null)}
      >
        {/* ── Grid lines ── */}
        {yTicks.map((t) => (
          <line
            key={`yg-${t}`}
            x1={PAD.left}
            x2={PAD.left + PW}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}

        {/* ── Y axis ── */}
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + PH}
          stroke="var(--border)"
          strokeWidth={1.5}
        />
        {yTicks.map((t) => (
          <g key={`yt-${t}`}>
            <text
              x={PAD.left - 6}
              y={yScale(t) + 4}
              textAnchor="end"
              fontSize={9}
              fill="var(--text-tertiary)"
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={-(PAD.top + PH / 2)}
          y={14}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill="var(--text-secondary)"
          transform="rotate(-90)"
        >
          Cumulative Luck
        </text>

        {/* ── X axis ── */}
        <line
          x1={PAD.left}
          x2={PAD.left + PW}
          y1={PAD.top + PH}
          y2={PAD.top + PH}
          stroke="var(--border)"
          strokeWidth={1.5}
        />
        {gwTicks.map((gw) => (
          <g key={`xt-${gw}`}>
            <line
              x1={xScale(gw)}
              x2={xScale(gw)}
              y1={PAD.top + PH}
              y2={PAD.top + PH + 4}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={xScale(gw)}
              y={PAD.top + PH + 15}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-tertiary)"
            >
              {gw}
            </text>
          </g>
        ))}
        <text
          x={PAD.left + PW / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill="var(--text-secondary)"
        >
          Gameweek
        </text>

        {/* ── Lines (faint first, then highlighted on top) ── */}
        {[false, true].map((isHighlightPass) =>
          teamTotals.map((team) => {
            const isHighlighted = highlightedIds.has(team.teamId) || hoveredTeam === team.teamId;
            if (isHighlightPass !== isHighlighted) return null;

            const color = luckRankToColor(team.luckRank, total);
            const opacity = hoveredTeam
              ? hoveredTeam === team.teamId
                ? 1
                : 0.1
              : isHighlighted
                ? 0.9
                : 0.18;

            const gws = Array.from({ length: gwCount }, (_, i) => gwA + i);
            const pathD = gws
              .map((gw, i) => {
                const x = xScale(gw);
                const y = yScale(team.gwPoints[gw] ?? 0);
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');

            const lastGw = gwB;
            const lastX = xScale(lastGw);
            const lastY = yScale(team.gwPoints[lastGw] ?? 0);
            const teamObj = teamMap[team.teamId];
            const label = teamObj?.shortName ?? team.teamId;

            return (
              <g
                key={team.teamId}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredTeam(team.teamId)}
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  opacity={opacity}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* End-of-line label */}
                {isHighlighted && (
                  <>
                    <circle cx={lastX} cy={lastY} r={4} fill={color} opacity={opacity} />
                    <text
                      x={lastX + 6}
                      y={lastY + 4}
                      fontSize={9}
                      fontWeight={700}
                      fill={color}
                      opacity={opacity}
                    >
                      {label}
                    </text>
                  </>
                )}
              </g>
            );
          }),
        )}
      </svg>
      <p className={styles.hint}>
        Top 3 luckiest and bottom 3 unluckiest are highlighted. Hover a line for details.
      </p>
    </div>
  );
}
