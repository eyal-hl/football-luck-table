import { useState, useEffect, useMemo } from 'react';
import type { LeagueId, AppTab, Theme } from './types';
import { useLeagueData } from './hooks/useLeagueData';
import { calculateLuckTable, calculateCumulativeLuck } from './utils/calculations';
import { LeagueSelector } from './components/LeagueSelector/LeagueSelector';
import { Phase1Controls, Phase2Controls } from './components/Controls/Controls';
import { LuckTable } from './components/LuckTable/LuckTable';
import { CumulativeLuckTable } from './components/CumulativeLuckTable/CumulativeLuckTable';
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

  // ── League & Tab ──
  const [leagueId, setLeagueId] = useState<LeagueId>('premier-league');
  const [activeTab, setActiveTab] = useState<AppTab>('phase1');

  const { data, loading, error } = useLeagueData(leagueId);

  // ── Phase 1 controls ──
  const [p1FormWindow, setP1FormWindow] = useState(5);
  const [p1ScheduleStart, setP1ScheduleStart] = useState<number | null>(null);
  const [p1ScheduleEnd, setP1ScheduleEnd] = useState<number | null>(null);

  // ── Phase 2 controls ──
  const [p2FormWindow, setP2FormWindow] = useState(5);
  const [p2GwA, setP2GwA] = useState<number | null>(null);
  const [p2GwB, setP2GwB] = useState<number | null>(null);

  // Reset controls when league changes
  useEffect(() => {
    setP1ScheduleStart(null);
    setP1ScheduleEnd(null);
    setP2GwA(null);
    setP2GwB(null);
  }, [leagueId]);

  // Initialise schedule defaults once data loads
  useEffect(() => {
    if (!data) return;
    const cur = data.currentGameweek;
    const total = data.totalGameweeks;

    if (p1ScheduleStart === null) {
      setP1ScheduleStart(Math.min(cur + 1, total));
    }
    if (p1ScheduleEnd === null) {
      setP1ScheduleEnd(Math.min(cur + 5, total));
    }
    if (p2GwA === null) {
      setP2GwA(Math.max(1, cur - 4));
    }
    if (p2GwB === null) {
      setP2GwB(cur);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Computed values ──
  const p1Start = p1ScheduleStart ?? 1;
  const p1End = p1ScheduleEnd ?? 1;
  const p2A = p2GwA ?? 1;
  const p2B = p2GwB ?? 1;
  const maxGw = data?.totalGameweeks ?? 38;

  const luckEntries = useMemo(() => {
    if (!data || p1ScheduleStart === null || p1ScheduleEnd === null) return [];
    return calculateLuckTable(data, p1FormWindow, p1Start, p1End);
  }, [data, p1FormWindow, p1Start, p1End, p1ScheduleStart, p1ScheduleEnd]);

  const cumulativeEntries = useMemo(() => {
    if (!data || p2GwA === null || p2GwB === null) return [];
    return calculateCumulativeLuck(data, p2FormWindow, p2A, p2B);
  }, [data, p2FormWindow, p2A, p2B, p2GwA, p2GwB]);

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

      {/* ── League selector ── */}
      <div className={styles.leagueRow}>
        <LeagueSelector selected={leagueId} onChange={setLeagueId} />
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
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className={styles.statusBox}>
          <div className={styles.spinner} />
          Loading league data…
        </div>
      )}
      {error && <div className={styles.errorBox}>Error: {error}</div>}

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

          <div className={styles.callout}>
            <strong>How to read this table:</strong> Each team's opponents in GW {p1Start}–{p1End}{' '}
            are ranked by their form in the {p1FormWindow} games before each fixture. A higher
            average rank means easier opponents (luckier schedule).{' '}
            <strong>Green = Lucky</strong>, <strong>Red = Unlucky</strong>.
          </div>

          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              Luckiness Ranking — GW {p1Start} to GW {p1End}
            </span>
            <div className={styles.legend}>
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
          </div>

          <LuckTable data={data} entries={luckEntries} />
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
          </div>

          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              Cumulative Luck — GW {p2A} to GW {p2B}
            </span>
            <span className={styles.sectionMeta}>
              Form window: last {p2FormWindow} games · Higher total = luckier
            </span>
          </div>

          <CumulativeLuckTable data={data} entries={cumulativeEntries} />
        </div>
      )}
    </div>
  );
}

export default App;
