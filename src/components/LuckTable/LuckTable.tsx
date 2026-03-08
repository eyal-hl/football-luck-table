import { useMemo, useState } from 'react';
import type { LeagueData, LuckTableEntry } from '../../types';
import { luckRankToColor } from '../../utils/calculations';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './LuckTable.module.css';

interface Props {
  data: LeagueData;
  entries: LuckTableEntry[];
}

interface MatchResult {
  teamGoals: number;
  oppGoals: number;
  outcome: 'W' | 'D' | 'L';
}

function getMatchResult(data: LeagueData, teamId: string, gw: number): MatchResult | null {
  const gameweek = data.gameweeks.find((g) => g.gw === gw);
  if (!gameweek) return null;
  for (const match of gameweek.matches) {
    if (!match.played || match.homeGoals === null || match.awayGoals === null) continue;
    if (match.home === teamId) {
      const teamGoals = match.homeGoals;
      const oppGoals = match.awayGoals;
      return { teamGoals, oppGoals, outcome: teamGoals > oppGoals ? 'W' : teamGoals === oppGoals ? 'D' : 'L' };
    }
    if (match.away === teamId) {
      const teamGoals = match.awayGoals;
      const oppGoals = match.homeGoals;
      return { teamGoals, oppGoals, outcome: teamGoals > oppGoals ? 'W' : teamGoals === oppGoals ? 'D' : 'L' };
    }
  }
  return null;
}

export function LuckTable({ data, entries }: Props) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const teamMap = useMemo(
    () => Object.fromEntries(data.teams.map((t) => [t.id, t])),
    [data],
  );
  const total = entries.length;

  if (entries.length === 0) {
    return <div className={styles.empty}>No data to display for the selected range.</div>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.center}>#</th>
            <th>Team</th>
            <th className={styles.center}>Luck Score</th>
            <th className={styles.fixturesHeader}>Upcoming Fixtures</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const team = teamMap[entry.teamId];
            if (!team) return null;
            const color = luckRankToColor(entry.luckRank, total);
            const isExpanded = expandedTeamId === entry.teamId;

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

                <td className={styles.fixturesCell_td}>
                  <div className={styles.fixturesCell}>
                    {entry.fixtures.map((fix) => {
                      const opponent = teamMap[fix.opponentId];
                      const oppColor = luckRankToColor(fix.opponentFormRank, total);
                      return (
                        <span key={fix.gw} className={styles.fixturePill}>
                          <span className={styles.gwLabel}>GW{fix.gw}</span>
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
                  <td colSpan={4} className={styles.expandedCell}>
                    <div className={styles.drillDown}>
                      {entry.fixtures.map((fix) => {
                        const opponent = teamMap[fix.opponentId];
                        const result = getMatchResult(data, entry.teamId, fix.gw);
                        const oppColor = luckRankToColor(fix.opponentFormRank, total);
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
                            {result ? (
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
        </tbody>
      </table>
    </div>
  );
}
