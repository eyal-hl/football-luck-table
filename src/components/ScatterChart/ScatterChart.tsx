import { useMemo } from 'react';
import type { LeagueData } from '../../types';
import { luckRankToColor } from '../../utils/calculations';
import styles from './ScatterChart.module.css';

export interface ScatterPoint {
  teamId: string;
  luckScore: number;
  luckRank: number;
  actualPoints: number;
}

interface Props {
  data: LeagueData;
  points: ScatterPoint[];
}

const W = 600;
const H = 380;
const PAD = { top: 24, right: 36, bottom: 56, left: 60 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const TICK_COUNT = 5;

function niceRange(min: number, max: number, pad: number) {
  return { lo: min - pad, hi: max + pad };
}

function linTicks(lo: number, hi: number, n: number): number[] {
  const step = (hi - lo) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round((lo + step * i) * 10) / 10);
}

export function ScatterChart({ data, points }: Props) {
  const teamMap = useMemo(
    () => Object.fromEntries(data.teams.map((t) => [t.id, t])),
    [data],
  );

  const total = points.length;

  if (total < 2) {
    return (
      <div className={styles.empty}>Not enough data to display the chart.</div>
    );
  }

  const luckScores = points.map((p) => p.luckScore);
  const ptsList = points.map((p) => p.actualPoints);

  const luckMin = Math.min(...luckScores);
  const luckMax = Math.max(...luckScores);
  const luckPad = (luckMax - luckMin || 1) * 0.12;
  const { lo: xLo, hi: xHi } = niceRange(luckMin, luckMax, luckPad);

  const ptsMax = Math.max(...ptsList, 1);
  const { lo: yLo, hi: yHi } = niceRange(0, ptsMax, ptsMax * 0.1);

  const xScale = (v: number) => PAD.left + ((v - xLo) / (xHi - xLo)) * PW;
  const yScale = (v: number) => PAD.top + PH - ((v - yLo) / (yHi - yLo)) * PH;

  const medLuck = (luckMin + luckMax) / 2;
  const medPts = ptsMax / 2;

  const xTicks = linTicks(luckMin, luckMax, TICK_COUNT);
  const yTicks = linTicks(0, ptsMax, TICK_COUNT);

  return (
    <div className={styles.chartWrapper}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label="Luck score vs actual points scatter chart"
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

        {/* ── Median reference lines ── */}
        <line
          x1={xScale(medLuck)}
          x2={xScale(medLuck)}
          y1={PAD.top}
          y2={PAD.top + PH}
          stroke="var(--text-tertiary)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />
        <line
          x1={PAD.left}
          x2={PAD.left + PW}
          y1={yScale(medPts)}
          y2={yScale(medPts)}
          stroke="var(--text-tertiary)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />

        {/* ── Quadrant labels ── */}
        <text
          x={xScale(medLuck) + 6}
          y={PAD.top + 14}
          fontSize={9}
          fill="var(--text-tertiary)"
          opacity={0.7}
        >
          Lucky + Performing
        </text>
        <text
          x={PAD.left + 4}
          y={PAD.top + 14}
          fontSize={9}
          fill="var(--text-tertiary)"
          opacity={0.7}
        >
          Unlucky + Performing
        </text>
        <text
          x={xScale(medLuck) + 6}
          y={yScale(medPts) + PH / 2 + 14}
          fontSize={9}
          fill="var(--text-tertiary)"
          opacity={0.7}
        >
          Lucky + Struggling
        </text>
        <text
          x={PAD.left + 4}
          y={yScale(medPts) + PH / 2 + 14}
          fontSize={9}
          fill="var(--text-tertiary)"
          opacity={0.7}
        >
          Unlucky + Struggling
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
        {xTicks.map((t) => (
          <g key={`xt-${t}`}>
            <line
              x1={xScale(t)}
              x2={xScale(t)}
              y1={PAD.top + PH}
              y2={PAD.top + PH + 4}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={xScale(t)}
              y={PAD.top + PH + 16}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-tertiary)"
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        <text
          x={PAD.left + PW / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--text-secondary)"
        >
          Luck Score (higher = easier schedule)
        </text>

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
            <line
              x1={PAD.left - 4}
              x2={PAD.left}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yScale(t) + 4}
              textAnchor="end"
              fontSize={10}
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
          fontSize={11}
          fontWeight={600}
          fill="var(--text-secondary)"
          transform="rotate(-90)"
        >
          Actual Points
        </text>

        {/* ── Dots + labels ── */}
        {points.map((p) => {
          const team = teamMap[p.teamId];
          const cx = xScale(p.luckScore);
          const cy = yScale(p.actualPoints);
          const color = luckRankToColor(p.luckRank, total);
          const shortName = team?.shortName ?? p.teamId;
          const labelRight = cx + 12 + shortName.length * 6.5 < PAD.left + PW;
          return (
            <g key={p.teamId} className={styles.dot}>
              <title>
                {team?.name ?? p.teamId}: luck {p.luckScore.toFixed(1)}, {p.actualPoints} pts
              </title>
              <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.9} />
              <circle cx={cx} cy={cy} r={7} fill="none" stroke="var(--surface-1)" strokeWidth={1.5} />
              <text
                x={labelRight ? cx + 11 : cx - 11}
                y={cy - 9}
                textAnchor={labelRight ? 'start' : 'end'}
                fontSize={10}
                fontWeight={600}
                fill="var(--text-primary)"
                className={styles.label}
              >
                {shortName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
