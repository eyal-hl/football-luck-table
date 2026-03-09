import { useMemo, useState } from 'react';
import type { LeagueData, CumulativeLuckEntry } from '../../types';
import { luckRankToColor, getMatchResult } from '../../utils/calculations';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './CumulativeLuckTable.module.css';

interface Props {
  data: LeagueData;
  entries: CumulativeLuckEntry[];
}

export function CumulativeLuckTable({ data, entries }: Props) {
  const [filterText, setFilterText] = useState('');

  const teamMap = useMemo(
    () => Object.fromEntries(data.teams.map((t) => [t.id, t])),
    [data],
  );
  const total = entries.length;

  const filteredEntries = useMemo(() => {
    if (!filterText) return entries;
    const lower = filterText.toLowerCase();
    return entries.filter((e) => {
      const t = teamMap[e.teamId];
      return (
        t?.name.toLowerCase().includes(lower) ||
        t?.shortName.toLowerCase().includes(lower)
      );
    });
  }, [entries, filterText, teamMap]);

  if (entries.length === 0) {
    return <div className={styles.empty}>No data to display for the selected range.</div>;
  }

  return (
    <div>
      {/* ── Filter input ── */}
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.filterInput}
          placeholder="Filter teams…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        {filterText && (
          <button
            className={styles.filterClear}
            onClick={() => setFilterText('')}
            aria-label="Clear filter"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.center}>#</th>
              <th>Team</th>
              <th className={styles.center}>Total Points</th>
              <th>GW Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => {
              const team = teamMap[entry.teamId];
              if (!team) return null;
              const color = luckRankToColor(entry.luckRank, total);

              return (
                <tr key={entry.teamId}>
                  <td className={styles.rankCell}>{entry.luckRank}</td>

                  <td>
                    <div className={styles.teamCell}>
                      <TeamLogo name={team.name} logoUrl={team.logoUrl} size={26} />
                      <span className={styles.teamName}>{team.name}</span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className={styles.totalBadge} style={{ background: color }}>
                      {entry.totalPoints}
                    </span>
                  </td>

                  <td>
                    <div className={styles.breakdownCell}>
                      {entry.gameweeks.map((gwEntry) => {
                        const opponent = teamMap[gwEntry.opponentId];
                        const oppColor = luckRankToColor(gwEntry.opponentFormRank, total);
                        const result = getMatchResult(data, entry.teamId, gwEntry.gw);
                        const isUpcoming = gwEntry.gw > data.currentGameweek;

                        const oppName = opponent?.name ?? gwEntry.opponentId;
                        const ha = gwEntry.isHome ? 'H' : 'A';
                        const tooltipText = isUpcoming
                          ? `GW${gwEntry.gw} vs ${oppName} (${ha}) — Not yet played`
                          : result
                            ? `GW${gwEntry.gw} vs ${oppName} (${ha}) — ${result.teamGoals}–${result.oppGoals} ${result.outcome}`
                            : `GW${gwEntry.gw} vs ${oppName} (${ha})`;

                        return (
                          <div
                            key={gwEntry.gw}
                            className={`${styles.gwPill} ${isUpcoming ? styles.gwPillUpcoming : ''}`}
                            title={tooltipText}
                          >
                            <span className={styles.gwLabel}>GW{gwEntry.gw}</span>
                            <span className={styles.oppName}>
                              {opponent?.shortName ?? gwEntry.opponentId}
                              {gwEntry.isHome ? ' H' : ' A'}
                            </span>
                            <span
                              className={styles.rankBadge}
                              style={{ background: oppColor }}
                            >
                              #{gwEntry.opponentFormRank}
                            </span>
                            {!isUpcoming && result && (
                              <span
                                className={`${styles.inlineResult} ${
                                  result.outcome === 'W'
                                    ? styles.resultW
                                    : result.outcome === 'D'
                                      ? styles.resultD
                                      : styles.resultL
                                }`}
                              >
                                {result.teamGoals}–{result.oppGoals}
                              </span>
                            )}
                            {isUpcoming && <span className={styles.upcomingDot} />}
                          </div>
                        );
                      })}
                      {entry.gameweeks.length === 0 && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                          No matches in range
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredEntries.length === 0 && filterText && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No teams match "{filterText}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
