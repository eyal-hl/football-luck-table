import { describe, it, expect } from 'vitest';
import {
  calculateFormTable,
  lastFullyPlayedGw,
  calculateLuckTable,
  calculateCumulativeLuck,
  luckRankToColor,
} from '../utils/calculations';
import type { LeagueData } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(id: string) {
  return { id, name: id, shortName: id, logoUrl: '' };
}

function makeMatch(
  home: string,
  away: string,
  homeGoals: number | null,
  awayGoals: number | null,
  played = true,
) {
  return { home, away, homeGoals, awayGoals, played };
}

/** Minimal LeagueData builder for tests */
function makeData(
  teams: string[],
  gameweeks: { gw: number; matches: ReturnType<typeof makeMatch>[] }[],
): LeagueData {
  return {
    leagueId: 'premier-league',
    leagueName: 'Test League',
    season: '2024-25',
    currentGameweek: gameweeks.length,
    totalGameweeks: gameweeks.length,
    teams: teams.map(makeTeam),
    gameweeks,
  };
}

// ---------------------------------------------------------------------------
// calculateFormTable
// ---------------------------------------------------------------------------

describe('calculateFormTable', () => {
  it('returns a table with rank 1 for the team with the most points', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      {
        gw: 1,
        matches: [
          makeMatch('a', 'b', 3, 0), // a wins
          makeMatch('c', 'd', 1, 1), // draw
        ],
      },
    ]);

    const table = calculateFormTable(data, 1, 1);

    expect(table).toHaveLength(4);
    const rankById = Object.fromEntries(table.map((e) => [e.teamId, e.rank]));
    // 'a' has 3 pts, ranked 1st
    expect(rankById['a']).toBe(1);
    // 'c' and 'd' each have 1 pt, ranked 2nd and 3rd (after 'a')
    expect(rankById['c']).toBeLessThan(rankById['b']);
    expect(rankById['d']).toBeLessThan(rankById['b']);
    // 'b' has 0 pts, ranked last
    expect(rankById['b']).toBe(4);
  });

  it('breaks ties using goal difference then goals for', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      {
        gw: 1,
        matches: [
          makeMatch('a', 'b', 2, 0), // a: 3pts, GD+2, GF2
          makeMatch('c', 'd', 3, 1), // c: 3pts, GD+2, GF3
        ],
      },
    ]);

    const table = calculateFormTable(data, 1, 1);
    const rankById = Object.fromEntries(table.map((e) => [e.teamId, e.rank]));

    // Both 'a' and 'c' have 3 pts and GD+2, but 'c' has more goals for
    expect(rankById['c']).toBe(1);
    expect(rankById['a']).toBe(2);
  });

  it('accumulates results across multiple gameweeks', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      {
        gw: 1,
        matches: [makeMatch('a', 'b', 1, 0)], // a 3pts
      },
      {
        gw: 2,
        matches: [makeMatch('b', 'a', 0, 1)], // a +3pts more = 6pts total
      },
    ]);

    const table = calculateFormTable(data, 1, 2);
    const a = table.find((e) => e.teamId === 'a')!;
    expect(a.points).toBe(6);
    expect(a.won).toBe(2);
    expect(a.rank).toBe(1);
  });

  it('ignores unplayed matches', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      {
        gw: 1,
        matches: [
          makeMatch('a', 'b', null, null, false), // unplayed
          makeMatch('c', 'd', 2, 0), // played
        ],
      },
    ]);

    const table = calculateFormTable(data, 1, 1);
    const a = table.find((e) => e.teamId === 'a')!;
    const b = table.find((e) => e.teamId === 'b')!;
    expect(a.played).toBe(0);
    expect(b.played).toBe(0);
  });

  it('ignores gameweeks outside the requested range', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      { gw: 1, matches: [makeMatch('a', 'b', 3, 0)] }, // outside range
      { gw: 2, matches: [makeMatch('b', 'a', 2, 0)] }, // inside range
    ]);

    const table = calculateFormTable(data, 2, 2);
    const a = table.find((e) => e.teamId === 'a')!;
    const b = table.find((e) => e.teamId === 'b')!;
    // Only GW2 counted: b wins
    expect(b.points).toBe(3);
    expect(a.points).toBe(0);
  });

  it('assigns ranks 1 through N with no gaps', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      {
        gw: 1,
        matches: [
          makeMatch('a', 'b', 3, 0),
          makeMatch('c', 'd', 2, 0),
        ],
      },
    ]);
    const table = calculateFormTable(data, 1, 1);
    const ranks = table.map((e) => e.rank).sort((x, y) => x - y);
    expect(ranks).toEqual([1, 2, 3, 4]);
  });
});

// ---------------------------------------------------------------------------
// lastFullyPlayedGw
// ---------------------------------------------------------------------------

describe('lastFullyPlayedGw', () => {
  it('returns 0 when no gameweeks are fully played', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      { gw: 1, matches: [makeMatch('a', 'b', null, null, false)] },
    ]);
    expect(lastFullyPlayedGw(data)).toBe(0);
  });

  it('returns the highest fully-played GW number', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      { gw: 1, matches: [makeMatch('a', 'b', 1, 0)] },
      { gw: 2, matches: [makeMatch('c', 'd', 2, 1)] },
      { gw: 3, matches: [makeMatch('a', 'c', null, null, false)] }, // not fully played
    ]);
    expect(lastFullyPlayedGw(data)).toBe(2);
  });

  it('skips a partially-played gameweek and still finds later fully-played ones', () => {
    const data = makeData(['a', 'b', 'c', 'd'], [
      { gw: 1, matches: [makeMatch('a', 'b', 1, 0)] },
      {
        gw: 2,
        matches: [
          makeMatch('c', 'd', 1, 0),
          makeMatch('a', 'c', null, null, false), // partial
        ],
      },
      { gw: 3, matches: [makeMatch('b', 'd', 0, 0)] }, // fully played
    ]);
    expect(lastFullyPlayedGw(data)).toBe(3);
  });

  it('returns 0 when there are no gameweeks at all', () => {
    const data = makeData(['a', 'b', 'c', 'd'], []);
    expect(lastFullyPlayedGw(data)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateLuckTable
// ---------------------------------------------------------------------------

describe('calculateLuckTable', () => {
  /**
   * 4 teams: alpha, beta, gamma, delta.
   * GW1 & GW2 are played (form anchors).
   * GW3 is the schedule window being analysed.
   *
   * GW1 results: alpha beats beta 3-0, gamma beats delta 3-0
   * GW2 results: alpha beats gamma 1-0, beta beats delta 1-0
   *
   * Form after GW1-GW2 (used to evaluate GW3 opponents):
   *   alpha: 6pts → rank 1
   *   gamma: 3pts → rank 2
   *   beta:  3pts → rank 3  (same pts as gamma but worse GD: -1 vs +3)
   *   delta: 0pts → rank 4
   *
   * GW3 fixtures:
   *   alpha vs delta (alpha home) → alpha faces rank-4 opponent (lucky)
   *   beta  vs gamma (beta home)  → beta  faces rank-2 opponent (harder)
   *
   * Expected luck:
   *   alpha luckScore = 4 (faces delta rank 4) → luckier
   *   beta  luckScore = 2 (faces gamma rank 2)
   *   gamma luckScore = 3 (faces beta rank 3)
   *   delta luckScore = 1 (faces alpha rank 1) → unluckiest
   */
  function buildFourTeamData() {
    return makeData(['alpha', 'beta', 'gamma', 'delta'], [
      {
        gw: 1,
        matches: [
          makeMatch('alpha', 'beta', 3, 0),
          makeMatch('gamma', 'delta', 3, 0),
        ],
      },
      {
        gw: 2,
        matches: [
          makeMatch('alpha', 'gamma', 1, 0),
          makeMatch('beta', 'delta', 1, 0),
        ],
      },
      {
        gw: 3,
        matches: [
          makeMatch('alpha', 'delta', 1, 0),
          makeMatch('beta', 'gamma', 1, 0),
        ],
      },
    ]);
  }

  it('assigns luckRank 1 to the team facing the weakest opponents', () => {
    const data = buildFourTeamData();
    const table = calculateLuckTable(data, 2, 3, 3);

    const rankById = Object.fromEntries(table.map((e) => [e.teamId, e.luckRank]));
    // alpha faces delta (rank 4) → highest luckScore → luckRank 1
    expect(rankById['alpha']).toBe(1);
    // delta faces alpha (rank 1) → lowest luckScore → luckRank 4
    expect(rankById['delta']).toBe(4);
  });

  it('luckScore equals the average opponent form rank', () => {
    const data = buildFourTeamData();
    const table = calculateLuckTable(data, 2, 3, 3);

    const alpha = table.find((e) => e.teamId === 'alpha')!;
    // alpha faces delta who has rank 4 in the form table → luckScore = 4
    expect(alpha.luckScore).toBe(4);

    const delta = table.find((e) => e.teamId === 'delta')!;
    // delta faces alpha who has rank 1 → luckScore = 1
    expect(delta.luckScore).toBe(1);
  });

  it('populates fixture details correctly', () => {
    const data = buildFourTeamData();
    const table = calculateLuckTable(data, 2, 3, 3);

    const alpha = table.find((e) => e.teamId === 'alpha')!;
    expect(alpha.fixtures).toHaveLength(1);
    expect(alpha.fixtures[0].gw).toBe(3);
    expect(alpha.fixtures[0].opponentId).toBe('delta');
    expect(alpha.fixtures[0].isHome).toBe(true);
  });

  it('returns all teams in the result', () => {
    const data = buildFourTeamData();
    const table = calculateLuckTable(data, 2, 3, 3);
    expect(table).toHaveLength(4);
  });

  it('gives luckScore 0 to a team with no fixtures in the window', () => {
    // Add a 5th team that has no match in GW3
    const data = makeData(['alpha', 'beta', 'gamma', 'delta', 'extra'], [
      {
        gw: 1,
        matches: [
          makeMatch('alpha', 'beta', 1, 0),
          makeMatch('gamma', 'delta', 1, 0),
        ],
      },
      {
        gw: 2,
        matches: [makeMatch('alpha', 'delta', 1, 0)],
      },
      // 'extra' has no match in GW2 (the schedule window)
    ]);

    const table = calculateLuckTable(data, 1, 2, 2);
    const extra = table.find((e) => e.teamId === 'extra')!;
    expect(extra.luckScore).toBe(0);
    expect(extra.fixtures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// calculateCumulativeLuck
// ---------------------------------------------------------------------------

describe('calculateCumulativeLuck', () => {
  function buildCumulativeData() {
    // 4 teams, 3 played gameweeks
    return makeData(['a', 'b', 'c', 'd'], [
      {
        gw: 1,
        matches: [
          makeMatch('a', 'b', 3, 0), // a dominates
          makeMatch('c', 'd', 0, 0),
        ],
      },
      {
        gw: 2,
        matches: [
          makeMatch('a', 'c', 2, 0),
          makeMatch('b', 'd', 2, 0),
        ],
      },
      {
        gw: 3,
        matches: [
          makeMatch('a', 'd', 1, 0),
          makeMatch('b', 'c', 1, 0),
        ],
      },
    ]);
  }

  it('returns one entry per team', () => {
    const data = buildCumulativeData();
    const result = calculateCumulativeLuck(data, 2, 2, 3);
    expect(result).toHaveLength(4);
  });

  it('assigns luckRank 1 to the highest totalPoints team', () => {
    const data = buildCumulativeData();
    const result = calculateCumulativeLuck(data, 2, 2, 3);

    const sorted = [...result].sort((x, y) => x.luckRank - y.luckRank);
    const rank1 = sorted[0];
    // rank1 should have the highest totalPoints
    expect(rank1.totalPoints).toBe(Math.max(...result.map((e) => e.totalPoints)));
  });

  it('totalPoints equals the sum of per-gameweek opponent form ranks', () => {
    const data = buildCumulativeData();
    const result = calculateCumulativeLuck(data, 2, 2, 3);

    for (const entry of result) {
      const sum = entry.gameweeks.reduce((acc, gw) => acc + gw.opponentFormRank, 0);
      expect(entry.totalPoints).toBe(sum);
    }
  });

  it('gameweek entries record the correct opponent', () => {
    const data = buildCumulativeData();
    const result = calculateCumulativeLuck(data, 2, 2, 3);

    const aEntry = result.find((e) => e.teamId === 'a')!;
    // GW2: a vs c, GW3: a vs d
    const gwNums = aEntry.gameweeks.map((g) => g.gw);
    expect(gwNums).toContain(2);
    expect(gwNums).toContain(3);

    const gw2 = aEntry.gameweeks.find((g) => g.gw === 2)!;
    expect(gw2.opponentId).toBe('c');
    expect(gw2.isHome).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// luckRankToColor
// ---------------------------------------------------------------------------

describe('luckRankToColor', () => {
  it('returns green (hue 120) for rank 1 of total 1', () => {
    const color = luckRankToColor(1, 1);
    expect(color).toContain('hsl(120');
  });

  it('returns green for the luckiest team (rank 1)', () => {
    const color = luckRankToColor(1, 10);
    expect(color).toMatch(/hsl\(120,/);
  });

  it('returns red (hue 0) for the unluckiest team (rank = total)', () => {
    const color = luckRankToColor(10, 10);
    expect(color).toMatch(/hsl\(0,/);
  });

  it('hue decreases as rank increases', () => {
    const extractHue = (s: string) => parseInt(s.match(/hsl\((\d+)/)![1]);
    const hue1 = extractHue(luckRankToColor(1, 5));
    const hue3 = extractHue(luckRankToColor(3, 5));
    const hue5 = extractHue(luckRankToColor(5, 5));
    expect(hue1).toBeGreaterThan(hue3);
    expect(hue3).toBeGreaterThan(hue5);
  });

  it('returns a valid hsl string', () => {
    const color = luckRankToColor(3, 10);
    expect(color).toMatch(/^hsl\(\d+, \d+%, [\d.]+%\)$/);
  });
});
