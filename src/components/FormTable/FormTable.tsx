import { useMemo } from 'react';
import type { LeagueData, FormTable as FormTableType } from '../../types';
import { luckRankToColor } from '../../utils/calculations';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './FormTable.module.css';

interface Props {
  data: LeagueData;
  formTable: FormTableType;
}

export function FormTable({ data, formTable }: Props) {
  const teamMap = useMemo(
    () => Object.fromEntries(data.teams.map((t) => [t.id, t])),
    [data],
  );
  const total = formTable.length;

  if (formTable.length === 0) {
    return <div className={styles.noData}>No form data available for this window.</div>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th className={styles.left}>Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Goal Difference">GD</th>
            <th title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {formTable.map((entry) => {
            const team = teamMap[entry.teamId];
            if (!team) return null;
            const color = luckRankToColor(entry.rank, total);

            return (
              <tr key={entry.teamId}>
                <td className={styles.rankCell}>
                  <span className={styles.rankBadge} style={{ background: color }}>
                    {entry.rank}
                  </span>
                </td>
                <td>
                  <div className={styles.teamCell}>
                    <TeamLogo name={team.name} logoUrl={team.logoUrl} size={22} />
                    <span className={styles.teamName}>{team.name}</span>
                  </div>
                </td>
                <td>{entry.played}</td>
                <td>{entry.won}</td>
                <td>{entry.drawn}</td>
                <td>{entry.lost}</td>
                <td>{entry.goalsFor}</td>
                <td>{entry.goalsAgainst}</td>
                <td>{entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}</td>
                <td className={styles.pts}>{entry.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
