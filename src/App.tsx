import { useState, useEffect, useRef, useMemo } from 'react';
import type { LeagueId, AppTab, Theme, SeasonYear } from './types';
import { CURRENT_SEASON_YEAR } from './types';
import { useLeagueData } from './hooks/useLeagueData';
import {
  getUrlParam,
  getUrlInt,
  updateUrl,
  VALID_LEAGUES,
  VALID_SEASONS,
  VALID_TABS,
} from './hooks/useUrlState';
import { calculateLuckTable, calculateCumulativeLuck, calculateFormTable, lastFullyPlayedGw } from './utils/calculations';
import { LeagueSelector } from './components/LeagueSelector/LeagueSelector';
import { SeasonSelector } from './components/SeasonSelector/SeasonSelector';
import { Phase1Controls, Phase2Controls } from './components/Controls/Controls';
import { LuckTable } from './components/LuckTable/LuckTable';
import { CumulativeLuckTable } from './components/CumulativeLuckTable/CumulativeLuckTable';
import { LuckTrendChart } from './components/LuckTrendChart/LuckTrendChart';
import { FormTable } from './components/FormTable/FormTable';
import { ScatterChart } from './components/ScatterChart/ScatterChart';
import type { ScatterPoint } from './components/ScatterChart/ScatterChart';
import { SeasonComparison } from './components/SeasonComparison/SeasonComparison';
import { Accordion } from './components/Accordion/Accordion';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle';
import styles from './App.module.css';
import './index.css';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  // ── Theme ──
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored ?? getSystemTheme();
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── League, Season & Tab (URL-initialised) ──
  const [leagueId, setLeagueId] = useState<LeagueId>(() => {
    const v = getUrlParam('league');
    return VALID_LEAGUES.includes(v as LeagueId) ? (v as LeagueId) : 'premier-league';
  });

  const [seasonYear, setSeasonYear] = useState<SeasonYear>(() => {
    const v = getUrlInt('season');
    return (VALID_SEASONS as readonly number[]).includes(v ?? 0)
      ? (v as SeasonYear)
      : CURRENT_SEASON_YEAR;
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const v = getUrlParam('tab');
    return VALID_TABS.includes(v as AppTab) ? (v as AppTab) : 'phase1';
  });

  // ── Season comparison selected team ──
  const [cmpTeamId, setCmpTeamId] = useState<string | null>(() => getUrlParam('cmp'));

  const { data, loading, error } = useLeagueData(leagueId, seasonYear);

  // ── Phase 1 controls (URL-initialised) ──
  const [p1FormWindow, setP1FormWindow] = useState(() => getUrlInt('p1fw') ?? 5);
  const [p1ScheduleStart, setP1ScheduleStart] = useState<number | null>(
    () => getUrlInt('p1s'),
  );
  const [p1ScheduleEnd, setP1ScheduleEnd] = useState<number | null>(
    () => getUrlInt('p1e'),
  );

  // ── Phase 2 controls (URL-initialised) ──
  const [p2FormWindow, setP2FormWindow] = useState(() => getUrlInt('p2fw') ?? 5);
  const [p2GwA, setP2GwA] = useState<number | null>(() => getUrlInt('p2a'));
  const [p2GwB, setP2GwB] = useState<number | null>(() => getUrlInt('p2b'));

  // Reset GW controls when league or season changes (skip initial mount so URL params are preserved)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setP1ScheduleStart(null);
    setP1ScheduleEnd(null);
    setP2GwA(null);
    setP2GwB(null);
  }, [leagueId, seasonYear]);

  // Initialise GW defaults once data loads (only for null values)
  useEffect(() => {
    if (!data) return;
    const cur = data.currentGameweek;
    const total = data.totalGameweeks;

    if (p1ScheduleStart === null) setP1ScheduleStart(Math.min(cur + 1, total));
    if (p1ScheduleEnd === null) setP1ScheduleEnd(Math.min(cur + 5, total));
    if (p2GwA === null) setP2GwA(Math.max(1, cur - 4));
    if (p2GwB === null) setP2GwB(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── URL sync: write all state to URL on every change ──
  useEffect(() => {
    updateUrl({
      league: leagueId,
      season: seasonYear,
      tab: activeTab,
      p1fw: p1FormWindow,
      p1s: p1ScheduleStart,
      p1e: p1ScheduleEnd,
      p2fw: p2FormWindow,
      p2a: p2GwA,
      p2b: p2GwB,
      cmp: cmpTeamId,
    });
  }, [
    leagueId,
    seasonYear,
    activeTab,
    p1FormWindow,
    p1ScheduleStart,
    p1ScheduleEnd,
    p2FormWindow,
    p2GwA,
    p2GwB,
    cmpTeamId,
  ]);

  // ── Derived values ──
  const p1Start = p1ScheduleStart ?? 1;
  const p1End = p1ScheduleEnd ?? 1;
  const p2A = p2GwA ?? 1;
  const p2B = p2GwB ?? 1;
  const maxGw = data?.totalGameweeks ?? 38;

  const luckEntries = useMemo(() => {
    if (!data || p1ScheduleStart === null || p1ScheduleEnd === null) return [];
    return calculateLuckTable(data, p1FormWindow, p1Start, p1End);
  }, [data, p1FormWindow, p1Start, p1End, p1ScheduleStart, p1ScheduleEnd]);

  // Actual form table over the same Phase 1 range → for overperformance column
  const actualRankMap = useMemo(() => {
    if (!data || p1ScheduleStart === null || p1ScheduleEnd === null) return undefined;
    const table = calculateFormTable(data, p1Start, p1End);
    return Object.fromEntries(table.map((e) => [e.teamId, e.rank]));
  }, [data, p1Start, p1End, p1ScheduleStart, p1ScheduleEnd]);

  const cumulativeEntries = useMemo(() => {
    if (!data || p2GwA === null || p2GwB === null) return [];
    return calculateCumulativeLuck(data, p2FormWindow, p2A, p2B);
  }, [data, p2FormWindow, p2A, p2B, p2GwA, p2GwB]);

  const p1FormTable = useMemo(() => {
    if (!data || p1ScheduleStart === null) return [];
    const end = p1Start - 1;
    const start = Math.max(1, end - p1FormWindow + 1);
    if (end < 1) return [];
    return calculateFormTable(data, start, end);
  }, [data, p1FormWindow, p1Start, p1ScheduleStart]);

  const p2FormTable = useMemo(() => {
    if (!data || p2GwB === null) return [];
    const end = p2B;
    const start = Math.max(1, end - p2FormWindow + 1);
    return calculateFormTable(data, start, end);
  }, [data, p2FormWindow, p2B, p2GwB]);

  const scatterGwEnd = useMemo(() => (data ? lastFullyPlayedGw(data) : 0), [data]);

  const scatterPoints = useMemo((): ScatterPoint[] => {
    if (!data || scatterGwEnd < 1) return [];
    const scatterLuck = calculateLuckTable(data, p1FormWindow, 1, scatterGwEnd);
    const actualPtsTable = calculateFormTable(data, 1, scatterGwEnd);
    const ptsMap = Object.fromEntries(actualPtsTable.map((e) => [e.teamId, e.points]));
    return scatterLuck.map((e) => ({
      teamId: e.teamId,
      luckScore: e.luckScore,
      luckRank: e.luckRank,
      actualPoints: ptsMap[e.teamId] ?? 0,
    }));
  }, [data, scatterGwEnd, p1FormWindow]);

  return (
    <div className={styles.app}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>⚽ Football Luck Table</h1>
          <p className={styles.subtitle}>
            Schedule difficulty analysis based on opponent recent form
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      </header>

      {/* ── League + Season selectors ── */}
      <div className={styles.selectorsRow}>
        <LeagueSelector selected={leagueId} onChange={setLeagueId} />
        <div className={styles.selectorDivider} />
        <SeasonSelector selected={seasonYear} onChange={setSeasonYear} />
      </div>

      {/* ── Tab bar ── */}
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'phase1'}
          className={`${styles.tab} ${activeTab === 'phase1' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('phase1')}
        >
          Schedule Difficulty
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'phase2'}
          className={`${styles.tab} ${activeTab === 'phase2' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('phase2')}
        >
          Cumulative Luck
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'scatter'}
          className={`${styles.tab} ${activeTab === 'scatter' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('scatter')}
        >
          Luck vs Points
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'comparison'}
          className={`${styles.tab} ${activeTab === 'comparison' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Season Comparison
        </button>
      </div>

      {/* ── Loading / Error ── */}
      {loading && activeTab !== 'comparison' && (
        <div className={styles.statusBox}>
          <div className={styles.spinner} />
          Loading league data…
        </div>
      )}
      {error && activeTab !== 'comparison' && (
        <div className={styles.errorBox}>
          {error.includes('No data available')
            ? `No data for this season yet. Run: python scripts/update_data.py --league ${leagueId} --season ${seasonYear}`
            : `Error: ${error}`}
        </div>
      )}

      {/* ── Phase 1 ── */}
      {!loading && !error && data && activeTab === 'phase1' && (
        <div className={styles.section}>
          <Phase1Controls
            formWindow={p1FormWindow}
            scheduleStart={p1Start}
            scheduleEnd={p1End}
            maxGw={maxGw}
            onFormWindowChange={setP1FormWindow}
            onScheduleStartChange={setP1ScheduleStart}
            onScheduleEndChange={setP1ScheduleEnd}
          />

          {/* Preset button for upcoming fixtures */}
          <div className={styles.presetRow}>
            <button
              className={styles.presetBtn}
              onClick={() => {
                const cur = data.currentGameweek;
                const total = data.totalGameweeks;
                setP1ScheduleStart(Math.min(cur + 1, total));
                setP1ScheduleEnd(Math.min(cur + 10, total));
              }}
            >
              ↗ Upcoming 10 GWs
            </button>
          </div>

          <div className={styles.callout}>
            <strong>How to read this table:</strong> Each team's opponents in GW {p1Start}–{p1End}{' '}
            are ranked by their form in the {p1FormWindow} games before each fixture. A higher
            average rank means easier opponents (luckier schedule).{' '}
            <strong>Green = Lucky</strong>, <strong>Red = Unlucky</strong>. Click any row to see
            fixture details. The <strong>vs Form</strong> column shows how the team is performing
            relative to their schedule difficulty (+ = over-performing).
          </div>

          <Accordion
            title={`Luckiness Ranking — GW ${p1Start} to GW ${p1End}`}
            meta={`${luckEntries.length} teams`}
          >
            <div className={styles.legendRow}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'hsl(120,65%,42%)' }} />
                Luckiest
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'hsl(60,65%,45%)' }} />
                Average
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'hsl(0,65%,50%)' }} />
                Unluckiest
              </span>
            </div>
            <LuckTable data={data} entries={luckEntries} actualRankMap={actualRankMap} />
          </Accordion>

          <Accordion
            title="Form Table"
            meta={`last ${p1FormWindow} games · up to GW ${p1Start - 1}`}
            defaultOpen={false}
          >
            <FormTable data={data} formTable={p1FormTable} />
          </Accordion>
        </div>
      )}

      {/* ── Phase 2 ── */}
      {!loading && !error && data && activeTab === 'phase2' && (
        <div className={styles.section}>
          <Phase2Controls
            formWindow={p2FormWindow}
            gwA={p2A}
            gwB={p2B}
            maxGw={maxGw}
            onFormWindowChange={setP2FormWindow}
            onGwAChange={setP2GwA}
            onGwBChange={setP2GwB}
          />

          <div className={styles.callout}>
            <strong>Cumulative Luck:</strong> For each GW in GW {p2A}–{p2B}, the opponent's form
            rank is calculated from the {p2FormWindow} games before that GW (sliding window). All
            ranks are summed — a higher total means the team faced weaker opponents throughout the
            period. <strong>Green = Luckiest</strong>, <strong>Red = Unluckiest</strong>.
            Hover GW pills to see match results.
          </div>

          <Accordion
            title={`Cumulative Luck — GW ${p2A} to GW ${p2B}`}
            meta={`form window: last ${p2FormWindow} games · higher total = luckier`}
          >
            <CumulativeLuckTable data={data} entries={cumulativeEntries} />
          </Accordion>

          <Accordion
            title="Luck Trend"
            meta={`GW ${p2A}–${p2B} · running total`}
            defaultOpen={false}
          >
            <LuckTrendChart data={data} entries={cumulativeEntries} gwA={p2A} gwB={p2B} />
          </Accordion>

          <Accordion
            title="Form Table"
            meta={`last ${p2FormWindow} games · up to GW ${p2B}`}
            defaultOpen={false}
          >
            <FormTable data={data} formTable={p2FormTable} />
          </Accordion>
        </div>
      )}

      {/* ── Scatter: Luck vs Points ── */}
      {!loading && !error && data && activeTab === 'scatter' && (
        <div className={styles.section}>
          <div className={styles.callout}>
            <strong>Luck vs Points</strong> — GW 1–{scatterGwEnd}: compares each team's full-season
            schedule luck (avg opponent form rank) against their actual points earned.
            Top-right = lucky <em>and</em> performing well. Bottom-left = unlucky <em>and</em>{' '}
            struggling.
          </div>
          <ScatterChart data={data} points={scatterPoints} />
        </div>
      )}

      {/* ── Season Comparison ── */}
      {activeTab === 'comparison' && (
        <div className={styles.section}>
          <div className={styles.callout}>
            <strong>Season Comparison:</strong> Select a team to see how their schedule luck has
            varied across all available seasons in this league. Uses the full played season
            (GW 1 to last completed GW) with a fixed 5-game form window.
          </div>
          <SeasonComparison
            leagueId={leagueId}
            currentSeasonYear={seasonYear}
            selectedTeamId={cmpTeamId}
            onSelectTeam={setCmpTeamId}
          />
        </div>
      )}
    </div>
  );
}

export default App;
