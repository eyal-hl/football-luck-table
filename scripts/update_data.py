#!/usr/bin/env python3
"""
Football Luck Table -- Data Update Script
==========================================
Fetches live match data from football-data.org and writes to
public/data/{league-id}-{season-year}.json files.

Usage:
    python scripts/update_data.py --all                    # current season
    python scripts/update_data.py --all --season 2024      # specific season
    python scripts/update_data.py --all --all-seasons      # all seasons
    python scripts/update_data.py --league premier-league  # one league

Requires API_KEY in .env (football-data.org token).
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

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

API_KEY    = os.environ.get("API_KEY", "")
API_BASE   = "https://api.football-data.org/v4"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"

SUPPORTED_SEASONS = [2021, 2022, 2023, 2024, 2025]
DEFAULT_SEASON    = 2025

LEAGUE_CONFIG: dict[str, dict[str, Any]] = {
    "premier-league": {"name": "Premier League", "code": "PL"},
    "la-liga":        {"name": "La Liga",         "code": "PD"},
    "serie-a":        {"name": "Serie A",         "code": "SA"},
    "bundesliga":     {"name": "Bundesliga",      "code": "BL1"},
}


def season_label(year: int) -> str:
    return f"{year}-{str(year + 1)[-2:]}"


def total_gws(league_id: str) -> int:
    return 34 if league_id == "bundesliga" else 38


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def api_get(path: str) -> Any:
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url, headers={"X-Auth-Token": API_KEY})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def fetch_league(league_id: str, season_year: int) -> dict:
    config = LEAGUE_CONFIG[league_id]
    code   = config["code"]
    gws    = total_gws(league_id)

    print(f"  Fetching teams ({code}, {season_year})...")
    teams_raw = api_get(f"/competitions/{code}/teams?season={season_year}")["teams"]
    time.sleep(7)

    print(f"  Fetching matches ({code}, {season_year})...")
    matches_raw = api_get(f"/competitions/{code}/matches?season={season_year}")["matches"]

    teams: list[dict] = []
    team_id_map: dict[int, str] = {}

    for t in teams_raw:
        slug = slugify(t["name"])
        team_id_map[t["id"]] = slug
        teams.append({
            "id": slug,
            "name": t["name"],
            "shortName": t.get("shortName") or t["name"],
            "logoUrl": t.get("crest", ""),
        })

    gw_map: dict[int, list[dict]] = {gw: [] for gw in range(1, gws + 1)}

    for m in matches_raw:
        matchday = m.get("matchday")
        if not matchday or matchday < 1 or matchday > gws:
            continue

        played    = m.get("status", "") == "FINISHED"
        home_slug = team_id_map.get(m["homeTeam"]["id"], slugify(m["homeTeam"].get("name", "")))
        away_slug = team_id_map.get(m["awayTeam"]["id"], slugify(m["awayTeam"].get("name", "")))

        if played:
            ft = m.get("score", {}).get("fullTime", {})
            home_goals, away_goals = ft.get("home"), ft.get("away")
            if home_goals is None or away_goals is None:
                played = False
                home_goals = away_goals = None
        else:
            home_goals = away_goals = None

        gw_map[matchday].append({
            "home": home_slug,
            "away": away_slug,
            "homeGoals": home_goals,
            "awayGoals": away_goals,
            "played": played,
        })

    gameweeks = [{"gw": gw, "matches": gw_map[gw]} for gw in range(1, gws + 1)]

    current_gw = 0
    for gw in range(1, gws + 1):
        ms = gw_map[gw]
        if ms and all(m["played"] for m in ms):
            current_gw = gw

    played_count = sum(1 for gw in gameweeks for m in gw["matches"] if m["played"])

    return {
        "teams": teams,
        "gameweeks": gameweeks,
        "currentGameweek": current_gw,
        "playedCount": played_count,
    }


def update(league_id: str, season_year: int) -> None:
    config = LEAGUE_CONFIG[league_id]
    print(f"\n-- {config['name']} {season_label(season_year)} --")

    if not API_KEY:
        print("  No API_KEY set in .env -- skipping.")
        return

    try:
        result = fetch_league(league_id, season_year)
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"  403 Forbidden -- plan does not cover {config['name']} or this season.")
        elif e.code == 404:
            print(f"  404 Not found -- season {season_year} may not exist yet.")
        else:
            print(f"  HTTP {e.code}: {e}")
        return
    except Exception as e:
        print(f"  Error: {e}")
        return

    output = {
        "leagueId": league_id,
        "leagueName": config["name"],
        "season": season_label(season_year),
        "currentGameweek": result["currentGameweek"],
        "totalGameweeks": total_gws(league_id),
        "teams": result["teams"],
        "gameweeks": result["gameweeks"],
    }

    out_path = OUTPUT_DIR / f"{league_id}-{season_year}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  OK {len(result['teams'])} teams, {result['playedCount']} played, "
          f"GW {result['currentGameweek']} -> {out_path.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Update football luck table data")

    lg = parser.add_mutually_exclusive_group(required=True)
    lg.add_argument("--league", choices=list(LEAGUE_CONFIG.keys()))
    lg.add_argument("--all", action="store_true")

    sg = parser.add_mutually_exclusive_group()
    sg.add_argument("--season", type=int, choices=SUPPORTED_SEASONS, default=DEFAULT_SEASON)
    sg.add_argument("--all-seasons", action="store_true")

    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    leagues = list(LEAGUE_CONFIG.keys()) if args.all else [args.league]
    seasons = SUPPORTED_SEASONS if args.all_seasons else [args.season]

    total = len(leagues) * len(seasons)
    done  = 0

    for season_year in seasons:
        for league_id in leagues:
            update(league_id, season_year)
            done += 1
            if done < total:
                print("  (pausing 7 s...)")
                time.sleep(7)

    print("\nDone.")


if __name__ == "__main__":
    main()
