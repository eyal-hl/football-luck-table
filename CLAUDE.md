# CLAUDE.md — Football Luck Table

This file provides AI assistants with a thorough understanding of the codebase,
development workflows, and conventions to follow when contributing to this project.

---

## Project Overview

**Football Luck Table** is a React + TypeScript single-page application that
quantifies "schedule luck" in football (soccer). It answers the question: *which
teams had the easiest or hardest fixture schedules, based on how good their
opponents actually were at the time they played?*

Three analysis modes are provided:

| Mode | Description |
|------|-------------|
| **Phase 1 – Schedule Difficulty** | Ranks every team by their average *opponent form rank* across a selected gameweek range |
| **Phase 2 – Cumulative Luck** | Sums opponent form ranks over the range, using a rolling form window |
| **Scatter Chart** | Plots luck score vs actual points earned to reveal over/under-performers |

Supported leagues: Premier League, La Liga, Serie A, Bundesliga, Ligat Ha'al.
Supported seasons: 2021-22 through 2025-26.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 19 |
| Language | TypeScript 5 (strict mode) |
| Build tool | Vite 7 |
| Styling | CSS Modules + CSS custom properties |
| Linting | ESLint 9 with typescript-eslint |
| Data scripts | Python 3 |
| Deployment | GitHub Pages via GitHub Actions |

---

## Repository Layout

```
football-luck-table/
├── .github/workflows/deploy.yml   # CI/CD: build + deploy to GitHub Pages
├── public/data/                   # Static JSON match data (23 files)
│   ├── premier-league-2024.json
│   ├── la-liga-2024.json
│   ├── serie-a-2024.json
│   ├── bundesliga-2024.json
│   ├── ligat-haal-2024.json
│   └── … (one file per league × season)
├── scripts/
│   ├── update_data.py             # Fetches live data from external APIs
│   ├── generate_stub_data.py      # Generates deterministic test fixtures
│   └── find_allsports_league.py   # Utility for finding AllSports league IDs
├── src/
│   ├── components/                # 11 React components
│   ├── hooks/                     # 2 custom hooks
│   ├── utils/calculations.ts      # Core luck-calculation algorithms
│   ├── types/index.ts             # Shared TypeScript interfaces
│   ├── App.tsx                    # Root component + global state
│   ├── main.tsx                   # React entry point
│   ├── App.module.css             # App-level styles
│   └── index.css                  # Global styles and CSS variables
├── index.html                     # Vite HTML shell
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
└── package.json
```

---

## Source Files in Detail

### `src/types/index.ts`

Central type definitions used everywhere. Key interfaces:

```ts
Team           // { id, name, shortName, logoUrl }
Match          // { home, away, homeGoals, awayGoals, played }
Gameweek       // { gw: number, matches: Match[] }
LeagueData     // Full JSON structure loaded from public/data/
LuckEntry      // Row in the Phase 1 table
CumulativeLuckEntry  // Row in the Phase 2 table
FormEntry      // Row in the form table
```

Always extend or update this file when new data shapes are introduced.

### `src/utils/calculations.ts`

All core algorithms live here. The four exported functions are:

| Function | Purpose |
|----------|---------|
| `calculateFormTable(data, gwStart, gwEnd, formWindow)` | Builds a form table from actual match results in the given range |
| `calculateLuckTable(data, gwStart, gwEnd, formWindow)` | Phase 1 – ranks teams by average opponent form rank |
| `calculateCumulativeLuck(data, gwStart, gwEnd, formWindow)` | Phase 2 – sums opponent form ranks per gameweek |
| `lastPlayedGwBefore(data, gw)` | Returns the last *played* gameweek before `gw` (anchors form windows) |

**Important algorithm detail**: form is evaluated at the *start of the range*
(i.e., using `lastPlayedGwBefore(gwStart - 1)` as the anchor), so that
pre-existing form – not results during the range itself – determines luck scores.

### `src/App.tsx`

Root component that owns all interactive state:

- `league`, `season` – which dataset to load
- `gwStart`, `gwEnd` – selected gameweek range
- `formWindow` – number of recent games used to judge opponent form
- `selectedTeam` – drill-down row selection
- `phase` – which analysis mode is active (1 or 2)
- `theme` – light/dark

State is persisted to and restored from URL query parameters via `useUrlState`.

### `src/hooks/useLeagueData.ts`

Fetches `public/data/<league>-<season>.json` with an in-memory cache. Returns
`{ data, loading, error }`. Uses the `VITE_BASE_URL` environment variable to
construct the correct path in both local dev and GitHub Pages deployment.

### `src/hooks/useUrlState.ts`

Syncs all control values to URL query parameters on every change. Reads initial
values from the URL on first load, enabling deep-linking and share-able URLs.

---

## Components

| Component | File | Role |
|-----------|------|------|
| `App` | `App.tsx` | Root layout, state management |
| `LeagueSelector` | `LeagueSelector.tsx` | League picker with flag emoji |
| `SeasonSelector` | `SeasonSelector.tsx` | Season year dropdown |
| `Controls` | `Controls.tsx` | GW range sliders + form-window input |
| `RangeSlider` | `RangeSlider.tsx` | Dual-thumb range input |
| `LuckTable` | `LuckTable.tsx` | Phase 1 results table |
| `CumulativeLuckTable` | `CumulativeLuckTable.tsx` | Phase 2 results table |
| `ScatterChart` | `ScatterChart.tsx` | SVG scatter plot |
| `FormTable` | `FormTable.tsx` | Team form display |
| `Accordion` | `Accordion.tsx` | Collapsible panel wrapper |
| `TeamLogo` | `TeamLogo.tsx` | Logo image with fallback |
| `ThemeToggle` | `ThemeToggle.tsx` | Light/dark mode switch |

---

## Data Files (`public/data/`)

### Naming convention

```
<league-id>-<season-start-year>.json
```

Examples: `premier-league-2024.json`, `ligat-haal-2024.json`

### JSON schema

```jsonc
{
  "leagueId": "premier-league",
  "leagueName": "Premier League",
  "season": "2025-26",
  "currentGameweek": 29,       // latest GW with results
  "totalGameweeks": 38,
  "teams": [
    { "id": "arsenal-fc", "name": "Arsenal FC", "shortName": "Arsenal", "logoUrl": "…" }
  ],
  "gameweeks": [
    {
      "gw": 1,
      "matches": [
        { "home": "arsenal-fc", "away": "chelsea-fc", "homeGoals": 2, "awayGoals": 1, "played": true }
      ]
    }
  ]
}
```

### Data sources

| League | API |
|--------|-----|
| Premier League, La Liga, Serie A, Bundesliga | [football-data.org](https://www.football-data.org/) |
| Ligat Ha'al | [AllSportsApi](https://allsportsapi.com/) |

API keys are expected as environment variables:
- `FOOTBALL_DATA_API_KEY`
- `ALLSPORTS_API_KEY`

---

## Python Data Scripts

### `scripts/update_data.py`

Fetches live match data and writes/updates JSON files in `public/data/`.

```bash
# Update all leagues, current season
python scripts/update_data.py --all

# Update a single league
python scripts/update_data.py --league ligat-haal

# Update all leagues, all historical seasons
python scripts/update_data.py --all --all-seasons
```

### `scripts/generate_stub_data.py`

Generates deterministic stub JSON files useful for local development when
API keys are unavailable.

```bash
python scripts/generate_stub_data.py
```

---

## Pull Request Workflow

After committing and pushing changes on a feature branch, always check whether
a PR targeting `main` is already open for that branch. If none exists, open one.
Return the PR URL to the user so they can review it.

---

## Development Workflow

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Daily commands

```bash
npm run dev       # Vite dev server with HMR at http://localhost:5173
npm run build     # Type-check + production bundle → dist/
npm run preview   # Serve dist/ locally
npm run lint      # ESLint over src/
```

### TypeScript strictness

The project uses `strict: true` plus:

```json
"noUnusedLocals": true,
"noUnusedParameters": true
```

All `npm run build` runs `tsc -b` before Vite, so type errors block the build.
Never suppress type errors with `// @ts-ignore` unless absolutely necessary,
and add a comment explaining why.

### ESLint

Rules enforced: `@typescript-eslint/recommended`, `react-hooks/rules-of-hooks`,
`react-hooks/exhaustive-deps`, `react-refresh/only-export-components`.

Run `npm run lint` before committing. The CI build does not run lint
automatically, but local discipline is expected.

---

## Styling Conventions

- **CSS Modules** for all component styles — import as `styles` and use
  `styles.className`.
- **CSS custom properties** defined in `src/index.css` under `:root` and
  `[data-theme="dark"]` selectors drive theming.
- Light/dark theme is toggled via `data-theme` on `<html>`.
- System preference (`prefers-color-scheme`) is the default.
- No third-party component libraries — all UI is hand-built.
- Mobile-first layout; breakpoints are handled with `@media` queries.

---

## URL State

All control values (league, season, gwStart, gwEnd, formWindow, phase, theme)
are encoded as URL query parameters. This enables:

- Deep-linking to specific views
- Sharing analysis with others
- Browser back/forward navigation

When adding new controls, update `useUrlState.ts` to persist them.

---

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) deploys to GitHub Pages on
every push to `main` or `master`.

The deployment sets `VITE_BASE_URL=/football-luck-table/` so that asset paths
resolve correctly under the GitHub Pages subdirectory. When running locally,
`VITE_BASE_URL` defaults to `/`.

To deploy manually, push to `main`/`master` or trigger the workflow from the
GitHub Actions UI.

---

## Adding a New League

1. Identify the league in the relevant API and note its ID.
2. Add a fetch block in `scripts/update_data.py` for the new API source.
3. Create the initial data file(s) in `public/data/`.
4. Add the league entry to the `LEAGUES` constant in `src/App.tsx`
   (include `id`, `name`, and flag emoji).
5. Update `useLeagueData.ts` if the file-naming convention differs.
6. Verify by running `npm run dev` and selecting the new league.

## Adding a New Season

1. Run `python scripts/update_data.py --league <id>` after the new season's
   data appears in the API.
2. Add the season year to the `SEASONS` constant in `src/App.tsx`.
3. No code changes are needed beyond that.

---

## Key Conventions

- **No test suite** exists yet. Validate changes manually in the browser.
  When adding tests, place them in a `src/__tests__/` directory using Vitest
  (already a Vite-native option).
- **No default exports from utility files.** `calculations.ts` and `types/index.ts`
  use named exports only.
- **Component files** may use a default export (standard React convention).
- **Immutable data flow** — calculation functions are pure; they receive data
  and return new arrays. Do not mutate `LeagueData` objects.
- **Team IDs** are stable kebab-case strings (e.g., `"arsenal-fc"`). Never use
  display names as keys.
- **Gameweek numbers are 1-indexed** in all data files and internal logic.
- **`luckRankToColor(rank, total)`** maps rank 1 (luckiest) → green, rank N
  (unluckiest) → red via HSL interpolation. Keep this consistent when adding
  new table variants.
