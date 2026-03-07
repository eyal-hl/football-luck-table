import { useMemo } from 'react';
import type { LeagueData, CumulativeLuckEntry } from '../../types';
import { luckRankToColor } from '../../utils/calculations';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './CumulativeLuckTable.module.css';

interface Props {
  data: LeagueData;
  entries: CumulativeLuckEntry[];
}

export function CumulativeLuckTable({ data, entries }: Props) {
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
            <th className={styles.center}>Total Points</th>
            <th>GW Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
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
                      return (
                        <div key={gwEntry.gw} className={styles.gwPill}>
                          <span className={styles.gwLabel}>GW{gwEntry.gw}</span>
                          <span className={styles.oppName}>
                            {opponent?.shortName ?? gwEntry.opponentId}
                            {gwEntry.isHome ? ' H' : ' A'}
                          </span>
                          <span
                            className={styles.rankBadge}
                            style={{ background: oppColor }}
                            title={`Opponent form rank: ${gwEntry.opponentFormRank}`}
                          >
                            #{gwEntry.opponentFormRank}
                          </span>
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
        </tbody>
      </table>
    </div>
  );
}
