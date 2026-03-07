#!/usr/bin/env python3
"""
Football Luck Table — Data Update Script
========================================
Fetches live match data from football-data.org and writes it to
public/data/*.json files consumed by the frontend.

Usage:
    python scripts/update_data.py --all
    python scripts/update_data.py --league premier-league

Requires API_KEY in .env (football-data.org token).
Free tier covers Premier League only. Other leagues require a paid plan
— the script falls back to existing stub data for restricted competitions.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# ── Load .env ─────────────────────────────────────────────────────────────────

def load_env() -> None:
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

load_env()

# Force UTF-8 output on Windows so emoji/box chars don't crash
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Configuration ─────────────────────────────────────────────────────────────

API_KEY      = os.environ.get("API_KEY", "")
API_BASE     = "https://api.football-data.org/v4"
SEASON_YEAR  = "2025"   # football-data.org uses the start year
OUTPUT_DIR   = Path(__file__).parent.parent / "public" / "data"

LEAGUE_CONFIG: dict[str, dict[str, Any]] = {
    "premier-league": {
        "name": "Premier League",
        "season": "2025-26",
        "totalGameweeks": 38,
        "code": "PL",
    },
    "la-liga": {
        "name": "La Liga",
        "season": "2025-26",
        "totalGameweeks": 38,
        "code": "PD",
    },
    "serie-a": {
        "name": "Serie A",
        "season": "2025-26",
        "totalGameweeks": 38,
        "code": "SA",
    },
    "bundesliga": {
        "name": "Bundesliga",
        "season": "2025-26",
        "totalGameweeks": 34,
        "code": "BL1",
    },
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def api_get(path: str) -> Any:
    """Make an authenticated GET request to football-data.org."""
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url, headers={"X-Auth-Token": API_KEY})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


# ── football-data.org fetch ───────────────────────────────────────────────────

def fetch_from_football_data_org(league_id: str, config: dict) -> dict:
    code = config["code"]
    total_gws = config["totalGameweeks"]

    print(f"  Fetching teams for {config['name']} ({code})…")
    teams_raw = api_get(f"/competitions/{code}/teams?season={SEASON_YEAR}")["teams"]
    time.sleep(7)  # free tier: 10 req/min → ~6 s between calls, use 7 to be safe

    print(f"  Fetching matches for {config['name']} ({code})…")
    matches_raw = api_get(f"/competitions/{code}/matches?season={SEASON_YEAR}")["matches"]

    # ── Build teams list ──
    teams: list[dict] = []
    team_id_map: dict[int, str] = {}   # api numeric id → our slug

    for t in teams_raw:
        slug = slugify(t["name"])
        team_id_map[t["id"]] = slug
        teams.append({
            "id": slug,
            "name": t["name"],
            "shortName": t.get("shortName") or t["name"],
            "logoUrl": t.get("crest", ""),
        })

    # ── Build gameweeks ──
    # Group matches by matchday
    gw_map: dict[int, list[dict]] = {gw: [] for gw in range(1, total_gws + 1)}

    finished_gws: set[int] = set()

    for m in matches_raw:
        matchday = m.get("matchday")
        if matchday is None or matchday < 1 or matchday > total_gws:
            continue

        status = m.get("status", "")
        played = status == "FINISHED"

        home_api_id = m["homeTeam"]["id"]
        away_api_id = m["awayTeam"]["id"]
        home_slug = team_id_map.get(home_api_id, slugify(m["homeTeam"].get("name", "")))
        away_slug = team_id_map.get(away_api_id, slugify(m["awayTeam"].get("name", "")))

        if played:
            score = m.get("score", {}).get("fullTime", {})
            home_goals = score.get("home")
            away_goals = score.get("away")
            # Guard: mark as unplayed if goals are missing despite FINISHED status
            if home_goals is None or away_goals is None:
                played = False
                home_goals = None
                away_goals = None
            else:
                finished_gws.add(matchday)
        else:
            home_goals = None
            away_goals = None

        gw_map[matchday].append({
            "home": home_slug,
            "away": away_slug,
            "homeGoals": home_goals,
            "awayGoals": away_goals,
            "played": played,
        })

    gameweeks = [{"gw": gw, "matches": gw_map[gw]} for gw in range(1, total_gws + 1)]

    # currentGameweek = highest matchday where ALL matches are finished.
    # Scan all GWs so a postponed match mid-season does not freeze the counter.
    current_gw = 0
    for gw in range(1, total_gws + 1):
        matches_in_gw = gw_map[gw]
        if matches_in_gw and all(m["played"] for m in matches_in_gw):
            current_gw = gw

    return {
        "teams": teams,
        "gameweeks": gameweeks,
        "currentGameweek": current_gw,
    }


# ── Fallback: keep existing stub data ─────────────────────────────────────────

def load_existing(league_id: str) -> dict | None:
    path = OUTPUT_DIR / f"{league_id}.json"
    if path.exists():
        with open(path) as f:
            data = json.load(f)
        return {
            "teams": data["teams"],
            "gameweeks": data["gameweeks"],
            "currentGameweek": data["currentGameweek"],
        }
    return None


# ── Main update logic ──────────────────────────────────────────────────────────

def update_league(league_id: str) -> None:
    config = LEAGUE_CONFIG[league_id]
    print(f"\n── {config['name']} ──")

    if not API_KEY:
        print("  ✗ API_KEY not set in .env — skipping.")
        return

    try:
        result = fetch_from_football_data_org(league_id, config)
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"  ⚠ 403 Forbidden — your plan doesn't cover {config['name']}.")
            print("    Keeping existing data.")
            return
        raise

    output = {
        "leagueId": league_id,
        "leagueName": config["name"],
        "season": config["season"],
        "currentGameweek": result["currentGameweek"],
        "totalGameweeks": config["totalGameweeks"],
        "teams": result["teams"],
        "gameweeks": result["gameweeks"],
    }

    out_path = OUTPUT_DIR / f"{league_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    total_played = sum(
        1 for gw in result["gameweeks"] for m in gw["matches"] if m["played"]
    )
    print(f"  ✓ {len(result['teams'])} teams · {total_played} matches played · "
          f"current GW: {result['currentGameweek']} → {out_path.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Update football luck table data")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--league", choices=list(LEAGUE_CONFIG.keys()))
    group.add_argument("--all", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    leagues = list(LEAGUE_CONFIG.keys()) if args.all else [args.league]
    for i, league_id in enumerate(leagues):
        update_league(league_id)
        # Rate-limit between leagues (not needed within a league — we already sleep there)
        if args.all and i < len(leagues) - 1:
            print("  (waiting 7 s for rate limit…)")
            time.sleep(7)

    print("\nDone.")


if __name__ == "__main__":
    main()
