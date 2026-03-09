import type {
  LeagueData,
  FormTable,
  TeamFormEntry,
  LuckTableEntry,
  OpponentFixture,
  CumulativeLuckEntry,
  CumulativeGameweekEntry,
} from '../types';

/**
 * Calculate a form table using only results from gameweeks in [startGw, endGw].
 * Returns teams ranked 1 (best) to N (worst) by points, then GD, then GF.
 */
export function calculateFormTable(
  data: LeagueData,
  startGw: number,
  endGw: number,
): FormTable {
  const stats: Record<string, Omit<TeamFormEntry, 'rank'>> = {};

  for (const team of data.teams) {
    stats[team.id] = {
      teamId: team.id,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    };
  }

  for (const gw of data.gameweeks) {
    if (gw.gw < startGw || gw.gw > endGw) continue;
    for (const match of gw.matches) {
      if (!match.played || match.homeGoals === null || match.awayGoals === null) continue;
      const home = stats[match.home];
      const away = stats[match.away];
      if (!home || !away) continue;

      home.played++;
      away.played++;
      home.goalsFor += match.homeGoals;
      home.goalsAgainst += match.awayGoals;
      away.goalsFor += match.awayGoals;
      away.goalsAgainst += match.homeGoals;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
      away.goalDifference = away.goalsFor - away.goalsAgainst;

      if (match.homeGoals > match.awayGoals) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (match.homeGoals === match.awayGoals) {
        home.drawn++;
        home.points += 1;
        away.drawn++;
        away.points += 1;
      } else {
        away.won++;
        away.points += 3;
        home.lost++;
      }
    }
  }

  const entries = Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return entries.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

/**
 * Return the highest GW number where every match in that gameweek was played.
 * "Fully played" means the gameweek has at least one match and all of them
 * have played === true. Gaps are ignored — e.g. if GW28 has a postponed match
 * but GW29 is fully played, this returns 29 (or higher if applicable).
 * Returns 0 if no fully-played gameweek exists yet.
 */
export function lastFullyPlayedGw(data: LeagueData): number {
  let last = 0;
  for (const gw of data.gameweeks) {
    if (gw.matches.length > 0 && gw.matches.every((m) => m.played)) {
      last = gw.gw;
    }
  }
  return last;
}

/**
 * Return the highest GW number strictly before `beforeGw` that has at least
 * one played match. This ensures the form window is always anchored to real
 * results and never shrinks when future (unplayed) gameweeks fall inside the
 * naive [gw - X, gw - 1] range.
 */
function lastPlayedGwBefore(data: LeagueData, beforeGw: number): number {
  let last = 0;
  for (const gw of data.gameweeks) {
    if (gw.gw < beforeGw && gw.matches.some((m) => m.played)) {
      last = gw.gw;
    }
  }
  return last;
}

/**
 * Get rank from a form table by team id.
 * Returns N+1 (worst possible) if team not found.
 */
function getRank(formTable: FormTable, teamId: string): number {
  const entry = formTable.find((e) => e.teamId === teamId);
  return entry ? entry.rank : formTable.length + 1;
}

/**
 * Find a team's opponent in a given gameweek. Returns null if not scheduled.
 */
function getOpponent(
  data: LeagueData,
  teamId: string,
  gw: number,
): { opponentId: string; isHome: boolean } | null {
  const gameweek = data.gameweeks.find((g) => g.gw === gw);
  if (!gameweek) return null;
  for (const match of gameweek.matches) {
    if (match.home === teamId) return { opponentId: match.away, isHome: true };
    if (match.away === teamId) return { opponentId: match.home, isHome: false };
  }
  return null;
}

/**
 * Phase 1: Calculate the luck table.
 *
 * For each team:
 *   1. Look at their fixtures in the schedule window [scheduleStartGw, scheduleEndGw].
 *   2. For each fixture, find the opponent's form rank computed from the last X
 *      *played* games before that gameweek. "Before" is anchored to the last GW
 *      with real results, so future fixtures always use a full X-game window.
 *   3. Average the opponent form ranks → luck score.
 *      Higher average rank = easier opponents = LUCKIER.
 */
export function calculateLuckTable(
  data: LeagueData,
  formWindowX: number,
  scheduleStartGw: number,
  scheduleEndGw: number,
): LuckTableEntry[] {
  const entries: LuckTableEntry[] = [];

  for (const team of data.teams) {
    const fixtures: OpponentFixture[] = [];

    for (let gw = scheduleStartGw; gw <= scheduleEndGw; gw++) {
      const opponent = getOpponent(data, team.id, gw);
      if (!opponent) continue;

      // Anchor formEnd to the last GW with real results before this fixture.
      // This prevents the window from shrinking when gw falls in the future
      // (where gw-1, gw-2, … are unplayed and would silently eat into the window).
      const formEnd   = lastPlayedGwBefore(data, gw);
      const formStart = Math.max(1, formEnd - formWindowX + 1);
      const formTable = calculateFormTable(data, formStart, formEnd);
      const opponentRank = getRank(formTable, opponent.opponentId);

      fixtures.push({
        gw,
        opponentId: opponent.opponentId,
        isHome: opponent.isHome,
        opponentFormRank: opponentRank,
      });
    }

    const luckScore =
      fixtures.length > 0
        ? fixtures.reduce((sum, f) => sum + f.opponentFormRank, 0) / fixtures.length
        : 0;

    entries.push({ teamId: team.id, luckScore, luckRank: 0, fixtures });
  }

  // Sort descending by luckScore (higher = luckier)
  entries.sort((a, b) => b.luckScore - a.luckScore);
  entries.forEach((e, idx) => {
    e.luckRank = idx + 1;
  });

  return entries;
}

/**
 * Phase 2: Calculate cumulative luck over a gameweek range [gwA, gwB].
 *
 * For each gameweek G in [A, B]:
 *   - Compute opponent's form rank using the last X played games before G
 *     (anchored to actual results, handles postponed matches correctly).
 * Sum all ranks per team → totalPoints. Higher = luckier.
 */
export function calculateCumulativeLuck(
  data: LeagueData,
  formWindowX: number,
  gwA: number,
  gwB: number,
): CumulativeLuckEntry[] {
  const entries: CumulativeLuckEntry[] = [];

  for (const team of data.teams) {
    const gameweeks: CumulativeGameweekEntry[] = [];

    for (let gw = gwA; gw <= gwB; gw++) {
      const opponent = getOpponent(data, team.id, gw);
      if (!opponent) continue;

      const formEnd   = lastPlayedGwBefore(data, gw);
      const formStart = Math.max(1, formEnd - formWindowX + 1);
      const formTable = calculateFormTable(data, formStart, formEnd);
      const opponentRank = getRank(formTable, opponent.opponentId);

      gameweeks.push({
        gw,
        opponentId: opponent.opponentId,
        isHome: opponent.isHome,
        opponentFormRank: opponentRank,
      });
    }

    const totalPoints = gameweeks.reduce((sum, g) => sum + g.opponentFormRank, 0);
    entries.push({ teamId: team.id, totalPoints, luckRank: 0, gameweeks });
  }

  entries.sort((a, b) => b.totalPoints - a.totalPoints);
  entries.forEach((e, idx) => {
    e.luckRank = idx + 1;
  });

  return entries;
}

/**
 * Map a luck rank (1 = luckiest, N = unluckiest) to a CSS hsl color
 * from green (lucky) to red (unlucky).
 */
export function luckRankToColor(rank: number, total: number): string {
  if (total <= 1) return 'hsl(120, 60%, 45%)';
  const t = (rank - 1) / (total - 1);
  const hue = Math.round(120 * (1 - t));
  const lightness = 42 + t * 8;
  return `hsl(${hue}, 65%, ${lightness}%)`;
}
