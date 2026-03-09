import { useMemo, useState } from 'react';
import type { LeagueData, LuckTableEntry } from '../../types';
import { luckRankToColor, getMatchResult } from '../../utils/calculations';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './LuckTable.module.css';

interface Props {
  data: LeagueData;
  entries: LuckTableEntry[];
  /** Map of teamId → actual points rank over the same range (for overperformance column) */
  actualRankMap?: Record<string, number>;
}

export function LuckTable({ data, entries, actualRankMap }: Props) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  const teamMap = useMemo(
    () => Object.fromEntries(data.teams.map((t) => [t.id, t])),
    [data],
  );
  const total = entries.length;

  // Show overperformance column only when at least one fixture has been played
  const showOverperf =
    !!actualRankMap &&
    entries.some((e) => e.fixtures.some((f) => f.gw <= data.currentGameweek));

  const colCount = showOverperf ? 5 : 4;

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
              <th className={styles.center}>Luck Score</th>
              {showOverperf && <th className={styles.center}>vs Form</th>}
              <th className={styles.fixturesHeader}>Fixtures</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => {
              const team = teamMap[entry.teamId];
              if (!team) return null;
              const color = luckRankToColor(entry.luckRank, total);
              const isExpanded = expandedTeamId === entry.teamId;

              const overperf = showOverperf && actualRankMap
                ? entry.luckRank - (actualRankMap[entry.teamId] ?? entry.luckRank)
                : null;

              return [
                <tr
                  key={entry.teamId}
                  className={styles.clickableRow}
                  onClick={() => setExpandedTeamId(isExpanded ? null : entry.teamId)}
                  aria-expanded={isExpanded}
                >
                  <td className={styles.rankCell}>
                    <span className={styles.rankWithChevron}>
                      {entry.luckRank}
                      <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>
                        ▾
                      </span>
                    </span>
                  </td>

                  <td>
                    <div className={styles.teamCell}>
                      <TeamLogo name={team.name} logoUrl={team.logoUrl} size={26} />
                      <span className={styles.teamName}>{team.name}</span>
                    </div>
                  </td>

                  <td className={styles.scoreCell} style={{ textAlign: 'center' }}>
                    <span
                      className={styles.luckBadge}
                      style={{ background: color }}
                      title={
                        entry.luckRank <= total / 3
                          ? 'Lucky schedule'
                          : entry.luckRank >= (total * 2) / 3
                            ? 'Unlucky schedule'
                            : 'Average schedule'
                      }
                    >
                      {entry.luckScore.toFixed(1)}
                    </span>
                  </td>

                  {showOverperf && (
                    <td className={styles.scoreCell} style={{ textAlign: 'center' }}>
                      {overperf !== null && (
                        <span
                          className={`${styles.overperfBadge} ${
                            overperf > 0
                              ? styles.overperfPos
                              : overperf < 0
                                ? styles.overperfNeg
                                : styles.overperfNeutral
                          }`}
                          title={
                            overperf > 0
                              ? 'Outperforming their schedule'
                              : overperf < 0
                                ? 'Underperforming their schedule'
                                : 'Performing as expected'
                          }
                        >
                          {overperf > 0 ? `+${overperf}` : overperf}
                        </span>
                      )}
                    </td>
                  )}

                  <td className={styles.fixturesCell_td}>
                    <div className={styles.fixturesCell}>
                      {entry.fixtures.map((fix) => {
                        const opponent = teamMap[fix.opponentId];
                        const oppColor = luckRankToColor(fix.opponentFormRank, total);
                        const isUpcoming = fix.gw > data.currentGameweek;
                        return (
                          <span
                            key={fix.gw}
                            className={`${styles.fixturePill} ${isUpcoming ? styles.fixturePillUpcoming : ''}`}
                          >
                            <span className={styles.gwLabel}>GW{fix.gw}</span>
                            {isUpcoming && <span className={styles.upcomingBadge}>upcoming</span>}
                            <span className={styles.homeAway}>{fix.isHome ? 'H' : 'A'}</span>
                            {opponent && (
                              <TeamLogo name={opponent.name} logoUrl={opponent.logoUrl} size={14} />
                            )}
                            <span>{opponent?.shortName ?? fix.opponentId}</span>
                            <span
                              className={styles.rankBadge}
                              style={{ background: oppColor }}
                              title={`Opponent form rank: ${fix.opponentFormRank}`}
                            >
                              #{fix.opponentFormRank}
                            </span>
                          </span>
                        );
                      })}
                      {entry.fixtures.length === 0 && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                          No fixtures in range
                        </span>
                      )}
                    </div>
                  </td>
                </tr>,

                isExpanded && (
                  <tr key={`${entry.teamId}-detail`} className={styles.expandedRow}>
                    <td colSpan={colCount} className={styles.expandedCell}>
                      <div className={styles.drillDown}>
                        {entry.fixtures.map((fix) => {
                          const opponent = teamMap[fix.opponentId];
                          const result = getMatchResult(data, entry.teamId, fix.gw);
                          const oppColor = luckRankToColor(fix.opponentFormRank, total);
                          const isUpcoming = fix.gw > data.currentGameweek;
                          return (
                            <div key={fix.gw} className={styles.drillRow}>
                              <span className={styles.drillGw}>GW{fix.gw}</span>
                              <span className={`${styles.drillHA} ${fix.isHome ? styles.drillHome : styles.drillAway}`}>
                                {fix.isHome ? 'H' : 'A'}
                              </span>
                              <TeamLogo
                                name={opponent?.name ?? ''}
                                logoUrl={opponent?.logoUrl ?? ''}
                                size={20}
                              />
                              <span className={styles.drillOpp}>
                                {opponent?.name ?? fix.opponentId}
                              </span>
                              <span
                                className={styles.drillFormBadge}
                                style={{ background: oppColor }}
                                title={`Opponent form rank: ${fix.opponentFormRank}`}
                              >
                                #{fix.opponentFormRank}
                              </span>
                              {isUpcoming ? (
                                <span className={styles.drillUpcoming}>UPCOMING</span>
                              ) : result ? (
                                <span
                                  className={`${styles.drillResult} ${
                                    result.outcome === 'W'
                                      ? styles.resultW
                                      : result.outcome === 'D'
                                        ? styles.resultD
                                        : styles.resultL
                                  }`}
                                >
                                  {result.teamGoals}–{result.oppGoals} {result.outcome}
                                </span>
                              ) : (
                                <span className={styles.drillNotPlayed}>—</span>
                              )}
                            </div>
                          );
                        })}
                        {entry.fixtures.length === 0 && (
                          <span className={styles.drillNotPlayed}>No fixtures in range</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
            {filteredEntries.length === 0 && filterText && (
              <tr>
                <td colSpan={colCount} className={styles.empty}>
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
