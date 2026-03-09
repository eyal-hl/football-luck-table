import { useEffect, useState, useMemo } from 'react';
import type { LeagueId, LeagueData, SeasonYear } from '../../types';
import { SEASONS } from '../../types';
import { calculateLuckTable, lastFullyPlayedGw, luckRankToColor } from '../../utils/calculations';
import { TeamLogo } from '../TeamLogo/TeamLogo';
import styles from './SeasonComparison.module.css';

interface SeasonResult {
  seasonYear: SeasonYear;
  seasonLabel: string;
  data: LeagueData | null;
  loading: boolean;
  error: boolean;
}

interface Props {
  leagueId: LeagueId;
  currentSeasonYear: SeasonYear;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
}

const BASE_URL = import.meta.env.BASE_URL as string;

async function fetchLeagueData(leagueId: LeagueId, year: SeasonYear): Promise<LeagueData> {
  const res = await fetch(`${BASE_URL}data/${leagueId}-${year}.json`);
  if (!res.ok) throw new Error('not found');
  return res.json() as Promise<LeagueData>;
}

export function SeasonComparison({ leagueId, currentSeasonYear, selectedTeamId, onSelectTeam }: Props) {
  const [seasons, setSeasons] = useState<SeasonResult[]>(() =>
    SEASONS.map((s) => ({
      seasonYear: s.year,
      seasonLabel: s.label,
      data: null,
      loading: true,
      error: false,
    })),
  );

  // Reload all seasons when league changes
  useEffect(() => {
    setSeasons(
      SEASONS.map((s) => ({
        seasonYear: s.year,
        seasonLabel: s.label,
        data: null,
        loading: true,
        error: false,
      })),
    );

    SEASONS.forEach((s) => {
      fetchLeagueData(leagueId, s.year)
        .then((d) =>
          setSeasons((prev) =>
            prev.map((r) =>
              r.seasonYear === s.year ? { ...r, data: d, loading: false } : r,
            ),
          ),
        )
        .catch(() =>
          setSeasons((prev) =>
            prev.map((r) =>
              r.seasonYear === s.year ? { ...r, loading: false, error: true } : r,
            ),
          ),
        );
    });
  }, [leagueId]);

  // Team list from the current season's data
  const currentSeasonData = seasons.find((s) => s.seasonYear === currentSeasonYear)?.data ?? null;

  const teams = useMemo(
    () => currentSeasonData?.teams ?? [],
    [currentSeasonData],
  );

  // Per-season luck rows for the selected team
  const rows = useMemo(() => {
    return seasons.map((s) => {
      if (s.loading || s.error || !s.data) return { ...s, luckRank: null, luckScore: null, gwEnd: null, teamCount: null };
      const gwEnd = lastFullyPlayedGw(s.data);
      if (gwEnd < 1) return { ...s, luckRank: null, luckScore: null, gwEnd: null, teamCount: null };
      const table = calculateLuckTable(s.data, 5, 1, gwEnd);
      const teamCount = table.length;
      const entry = selectedTeamId ? table.find((e) => e.teamId === selectedTeamId) : null;
      return {
        ...s,
        luckRank: entry?.luckRank ?? null,
        luckScore: entry?.luckScore ?? null,
        gwEnd,
        teamCount,
      };
    });
  }, [seasons, selectedTeamId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  return (
    <div className={styles.container}>
      {/* Team selector */}
      <div className={styles.selectorRow}>
        <label className={styles.selectorLabel}>Select a team:</label>
        <select
          className={styles.select}
          value={selectedTeamId ?? ''}
          onChange={(e) => onSelectTeam(e.target.value)}
        >
          <option value="">— choose a team —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedTeamId && (
        <div className={styles.prompt}>
          Pick a team above to see how their schedule luck has varied across seasons.
        </div>
      )}

      {selectedTeamId && (
        <>
          {selectedTeam && (
            <div className={styles.teamHeader}>
              <TeamLogo name={selectedTeam.name} logoUrl={selectedTeam.logoUrl} size={32} />
              <span className={styles.teamName}>{selectedTeam.name}</span>
              <span className={styles.leagueNote}>— schedule luck by season (form window: 5 games)</span>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Season</th>
                  <th className={styles.center}>Luck Rank</th>
                  <th className={styles.center}>Luck Score</th>
                  <th className={styles.center}>GWs analysed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  if (row.loading) {
                    return (
                      <tr key={row.seasonYear}>
                        <td>{row.seasonLabel}</td>
                        <td colSpan={3} className={styles.loading}>Loading…</td>
                      </tr>
                    );
                  }
                  if (row.error || !row.data) {
                    return (
                      <tr key={row.seasonYear} className={styles.errorRow}>
                        <td>{row.seasonLabel}</td>
                        <td colSpan={3} className={styles.noData}>No data</td>
                      </tr>
                    );
                  }
                  if (row.luckRank === null) {
                    return (
                      <tr key={row.seasonYear}>
                        <td>{row.seasonLabel}</td>
                        <td colSpan={3} className={styles.noData}>Season not started</td>
                      </tr>
                    );
                  }
                  const color = luckRankToColor(row.luckRank, row.teamCount ?? 1);
                  const isCurrentSeason = row.seasonYear === currentSeasonYear;
                  return (
                    <tr key={row.seasonYear} className={isCurrentSeason ? styles.currentSeason : ''}>
                      <td>
                        {row.seasonLabel}
                        {isCurrentSeason && <span className={styles.currentBadge}>current</span>}
                      </td>
                      <td className={styles.center}>
                        <span className={styles.rankBadge} style={{ background: color }}>
                          #{row.luckRank} / {row.teamCount}
                        </span>
                      </td>
                      <td className={styles.center}>
                        <span className={styles.scoreBadge} style={{ borderColor: color, color }}>
                          {row.luckScore?.toFixed(1)}
                        </span>
                      </td>
                      <td className={styles.center}>{row.gwEnd}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            Luck score = average opponent form rank across GW 1–N (higher = easier schedule).
            Form window fixed at 5 games for cross-season comparability.
          </p>
        </>
      )}
    </div>
  );
}
