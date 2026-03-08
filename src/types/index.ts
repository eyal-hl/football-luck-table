export type LeagueId = 'premier-league' | 'la-liga' | 'serie-a' | 'bundesliga' | 'ligat-haal';

// Season start year (e.g. 2025 = 2025-26 season)
export type SeasonYear = 2021 | 2022 | 2023 | 2024 | 2025;

export interface Season {
  year: SeasonYear;
  label: string; // e.g. "2025-26"
}

export const SEASONS: Season[] = [
  { year: 2025, label: '2025-26' },
  { year: 2024, label: '2024-25' },
  { year: 2023, label: '2023-24' },
  { year: 2022, label: '2022-23' },
  { year: 2021, label: '2021-22' },
];

export const CURRENT_SEASON_YEAR: SeasonYear = 2025;

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
}

export interface Match {
  home: string; // team id
  away: string; // team id
  homeGoals: number | null; // null = not yet played
  awayGoals: number | null;
  played: boolean;
}

export interface Gameweek {
  gw: number;
  matches: Match[];
}

export interface LeagueData {
  leagueId: LeagueId;
  leagueName: string;
  season: string;
  currentGameweek: number; // last completed GW
  totalGameweeks: number;
  teams: Team[];
  gameweeks: Gameweek[];
}

// --- Computed types ---

export interface TeamFormEntry {
  teamId: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  rank: number; // 1 = best form
}

export type FormTable = TeamFormEntry[];

export interface OpponentFixture {
  gw: number;
  opponentId: string;
  isHome: boolean;
  opponentFormRank: number;
}

export interface LuckTableEntry {
  teamId: string;
  luckScore: number; // average opponent form rank (higher = luckier)
  luckRank: number; // 1 = luckiest
  fixtures: OpponentFixture[];
}

export interface CumulativeGameweekEntry {
  gw: number;
  opponentId: string;
  isHome: boolean;
  opponentFormRank: number; // rank of the opponent *at that gameweek*
}

export interface CumulativeLuckEntry {
  teamId: string;
  totalPoints: number; // sum of opponent form ranks (higher = luckier)
  luckRank: number; // 1 = luckiest
  gameweeks: CumulativeGameweekEntry[];
}

export type AppTab = 'phase1' | 'phase2' | 'scatter';
export type Theme = 'light' | 'dark';
