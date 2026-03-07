import { useMemo } from 'react';
import type { LeagueData, LuckTableEntry } from '../../types';
import { luckRankToColor } from '../../utils/calculations';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './LuckTable.module.css';

interface Props {
  data: LeagueData;
  entries: LuckTableEntry[];
}

export function LuckTable({ data, entries }: Props) {
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
            <th>Upcoming Fixtures</th>
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

                <td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
