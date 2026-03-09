#!/usr/bin/env python3
"""
Football Luck Table -- Data Update Script
==========================================
Fetches live match data and writes to public/data/{league-id}-{season-year}.json

APIs used:
  football-data.org  -- Premier League, La Liga, Serie A, Bundesliga
  AllSportsApi       -- Ligat Ha'al

Usage:
    python scripts/update_data.py --all                  # all leagues, current season
    python scripts/update_data.py --league ligat-haal    # one league
    python scripts/update_data.py --all --season 2024    # specific season
    python scripts/update_data.py --all --all-seasons    # all seasons
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

# ── Shared helpers ─────────────────────────────────────────────────────────────

OUTPUT_DIR        = Path(__file__).parent.parent / "public" / "data"
SUPPORTED_SEASONS = [2021, 2022, 2023, 2024, 2025]
DEFAULT_SEASON    = 2025


def season_label(year: int) -> str:
    return f"{year}-{str(year + 1)[-2:]}"


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def current_gw_from_map(gw_map: dict[int, list[dict]], total: int) -> int:
    return max(
        (gw for gw in range(1, total + 1) if gw_map[gw] and all(m["played"] for m in gw_map[gw])),
        default=0,
    )


def write_output(league_id: str, league_name: str, season_year: int,
                 teams: list, gameweeks: list, current_gw: int,
                 total_gws: int, played_count: int) -> None:
    output = {
        "leagueId": league_id,
        "leagueName": league_name,
        "season": season_label(season_year),
        "currentGameweek": current_gw,
        "totalGameweeks": total_gws,
        "teams": teams,
        "gameweeks": gameweeks,
    }
    out_path = OUTPUT_DIR / f"{league_id}-{season_year}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  OK {len(teams)} teams, {played_count} played, "
          f"GW {current_gw} -> {out_path.name}")


# ── football-data.org ──────────────────────────────────────────────────────────

FD_API_KEY  = os.environ.get("API_KEY", "")
FD_API_BASE = "https://api.football-data.org/v4"

FD_LEAGUES: dict[str, dict[str, Any]] = {
    "premier-league": {"name": "Premier League", "code": "PL",  "totalGameweeks": 38},
    "la-liga":        {"name": "La Liga",         "code": "PD",  "totalGameweeks": 38},
    "serie-a":        {"name": "Serie A",         "code": "SA",  "totalGameweeks": 38},
    "bundesliga":     {"name": "Bundesliga",      "code": "BL1", "totalGameweeks": 34},
}


def fd_get(path: str) -> Any:
    url = f"{FD_API_BASE}{path}"
    req = urllib.request.Request(url, headers={"X-Auth-Token": FD_API_KEY})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def update_fd(league_id: str, season_year: int) -> None:
    config = FD_LEAGUES[league_id]
    code   = config["code"]
    gws    = config["totalGameweeks"]
    print(f"\n-- {config['name']} {season_label(season_year)} (football-data.org) --")

    if not FD_API_KEY:
        print("  No API_KEY set in .env -- skipping.")
        return

    try:
        print(f"  Fetching teams ({code}, {season_year})...")
        teams_raw = fd_get(f"/competitions/{code}/teams?season={season_year}")["teams"]
        time.sleep(7)

        print(f"  Fetching matches ({code}, {season_year})...")
        matches_raw = fd_get(f"/competitions/{code}/matches?season={season_year}")["matches"]
    except urllib.error.HTTPError as e:
        msg = {403: "plan does not cover this league/season", 404: "season not found"}.get(e.code, str(e))
        print(f"  HTTP {e.code}: {msg}")
        return
    except Exception as e:
        print(f"  Error: {e}")
        return

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
            "home": home_slug, "away": away_slug,
            "homeGoals": home_goals, "awayGoals": away_goals, "played": played,
        })

    gameweeks    = [{"gw": gw, "matches": gw_map[gw]} for gw in range(1, gws + 1)]
    current_gw   = current_gw_from_map(gw_map, gws)
    played_count = sum(1 for gw in gameweeks for m in gw["matches"] if m["played"])
    write_output(league_id, config["name"], season_year, teams, gameweeks, current_gw, gws, played_count)


# ── AllSportsApi ───────────────────────────────────────────────────────────────

ALLSPORTS_API_KEY  = os.environ.get("ALLSPORTS_API_KEY", "")
ALLSPORTS_API_BASE = "https://apiv2.allsportsapi.com/football/"

ALLSPORTS_LEAGUES: dict[str, dict[str, Any]] = {
    "ligat-haal": {
        "name": "Ligat Ha'al",
        "leagueId": os.environ.get("ALLSPORTS_LIGAT_HAAL_ID", "363"),
    },
}

# Israeli season runs roughly Aug-May
ALLSPORTS_SEASON_DATES: dict[int, tuple[str, str]] = {
    2021: ("2021-08-01", "2022-06-30"),
    2022: ("2022-08-01", "2023-06-30"),
    2023: ("2023-08-01", "2024-06-30"),
    2024: ("2024-08-01", "2025-06-30"),
    2025: ("2025-08-01", "2026-06-30"),
}


def allsports_get(params: dict) -> Any:
    params["APIkey"] = ALLSPORTS_API_KEY
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url   = f"{ALLSPORTS_API_BASE}?{query}"
    with urllib.request.urlopen(urllib.request.Request(url), timeout=15) as resp:
        return json.loads(resp.read())


def parse_round(round_str: str) -> int | None:
    m = re.search(r"\d+", str(round_str))
    return int(m.group()) if m else None


def update_allsports(league_id: str, season_year: int) -> None:
    config    = ALLSPORTS_LEAGUES[league_id]
    lid       = config["leagueId"]
    date_from, date_to = ALLSPORTS_SEASON_DATES[season_year]
    print(f"\n-- {config['name']} {season_label(season_year)} (AllSportsApi, leagueId={lid}) --")

    if not ALLSPORTS_API_KEY:
        print("  No ALLSPORTS_API_KEY set in .env -- skipping.")
        return

    try:
        print(f"  Fetching fixtures ({date_from} to {date_to})...")
        data = allsports_get({"met": "Fixtures", "leagueId": lid, "from": date_from, "to": date_to})
    except Exception as e:
        print(f"  Error fetching fixtures: {e}")
        return

    if not data.get("success"):
        print(f"  API error: {data}")
        return

    fixtures = data.get("result") or []
    if not fixtures:
        print(f"  No fixtures returned for leagueId={lid}.")
        print("  To find the correct ID, run: python scripts/find_allsports_league.py")
        return

    # Build teams and rounds from fixture data
    team_map: dict[int, dict] = {}
    round_matches: dict[int, list[dict]] = {}

    for f in fixtures:
        home_key = int(f.get("home_team_key") or 0)
        away_key = int(f.get("away_team_key") or 0)

        for key, name, logo in [
            (home_key, f.get("event_home_team", ""), f.get("home_team_logo", "")),
            (away_key, f.get("event_away_team", ""), f.get("away_team_logo", "")),
        ]:
            if key and key not in team_map:
                team_map[key] = {
                    "id": slugify(name),
                    "name": name,
                    "shortName": name,
                    "logoUrl": logo or "",
                }

        rnd = parse_round(f.get("league_round", ""))
        if not rnd or rnd < 1:
            continue

        status    = f.get("event_status", "")
        played    = status == "Finished"
        home_slug = team_map.get(home_key, {}).get("id", slugify(f.get("event_home_team", "")))
        away_slug = team_map.get(away_key, {}).get("id", slugify(f.get("event_away_team", "")))

        home_goals = away_goals = None
        if played:
            result_str = f.get("event_final_result", "") or ""
            parts = re.split(r"\s*-\s*", result_str.strip())
            if len(parts) == 2:
                try:
                    home_goals = int(parts[0])
                    away_goals = int(parts[1])
                except ValueError:
                    played = False

        round_matches.setdefault(rnd, []).append({
            "home": home_slug, "away": away_slug,
            "homeGoals": home_goals, "awayGoals": away_goals, "played": played,
        })

    if not round_matches:
        print("  Could not parse any rounds. Check the fixture data format.")
        return

    total_gws    = max(round_matches.keys())
    gw_map       = {gw: round_matches.get(gw, []) for gw in range(1, total_gws + 1)}
    gameweeks    = [{"gw": gw, "matches": gw_map[gw]} for gw in range(1, total_gws + 1)]
    current_gw   = current_gw_from_map(gw_map, total_gws)
    played_count = sum(1 for gw in gameweeks for m in gw["matches"] if m["played"])
    teams        = list(team_map.values())

    write_output(league_id, config["name"], season_year, teams, gameweeks, current_gw, total_gws, played_count)


# ── Main ───────────────────────────────────────────────────────────────────────

ALL_LEAGUES = list(FD_LEAGUES.keys()) + list(ALLSPORTS_LEAGUES.keys())


def update(league_id: str, season_year: int) -> None:
    if league_id in FD_LEAGUES:
        update_fd(league_id, season_year)
    else:
        update_allsports(league_id, season_year)


def main() -> None:
    parser = argparse.ArgumentParser(description="Update football luck table data")

    lg = parser.add_mutually_exclusive_group(required=True)
    lg.add_argument("--league", choices=ALL_LEAGUES)
    lg.add_argument("--all", action="store_true", help="All leagues")

    sg = parser.add_mutually_exclusive_group()
    sg.add_argument("--season", type=int, choices=SUPPORTED_SEASONS, default=DEFAULT_SEASON)
    sg.add_argument("--all-seasons", action="store_true")

    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    leagues = ALL_LEAGUES if args.all else [args.league]
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
