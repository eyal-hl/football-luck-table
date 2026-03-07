#!/usr/bin/env python3
"""
Football Luck Table — Data Update Script
========================================
Fetches live match data from an external API and writes it to the
public/data/*.json files consumed by the frontend.

Usage:
    export API_KEY="your_api_key_here"
    python3 scripts/update_data.py [--league premier-league] [--all]

Supported APIs (configure below):
    - football-data.org  (FOOTBALL_DATA_API)
    - api-football via RapidAPI  (API_FOOTBALL)

Currently this script contains a STUB implementation that shows the
expected structure. Swap out the fetch functions with real API calls
once you've chosen a provider.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

# ── Configuration ─────────────────────────────────────────────────────────────

API_KEY = os.environ.get("API_KEY", "")
API_PROVIDER = os.environ.get("API_PROVIDER", "football-data")  # or "api-football"

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"

# Mapping of our league IDs to API-specific competition codes
LEAGUE_CONFIG: dict[str, dict[str, Any]] = {
    "premier-league": {
        "name": "Premier League",
        "season": "2024-25",
        "totalGameweeks": 38,
        # football-data.org competition code:
        "football_data_code": "PL",
        # api-football league id:
        "api_football_id": 39,
    },
    "la-liga": {
        "name": "La Liga",
        "season": "2024-25",
        "totalGameweeks": 38,
        "football_data_code": "PD",
        "api_football_id": 140,
    },
    "serie-a": {
        "name": "Serie A",
        "season": "2024-25",
        "totalGameweeks": 38,
        "football_data_code": "SA",
        "api_football_id": 135,
    },
    "bundesliga": {
        "name": "Bundesliga",
        "season": "2024-25",
        "totalGameweeks": 34,
        "football_data_code": "BL1",
        "api_football_id": 78,
    },
}

# ── Data schema helpers ────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    """Convert a team name to a URL-safe id."""
    import re
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def make_match(home_id: str, away_id: str, home_goals: int | None, away_goals: int | None) -> dict:
    return {
        "home": home_id,
        "away": away_id,
        "homeGoals": home_goals,
        "awayGoals": away_goals,
        "played": home_goals is not None,
    }


# ── Stub fetch functions ───────────────────────────────────────────────────────
# Replace these with real HTTP calls once you've chosen an API.

def fetch_teams_stub(league_id: str) -> list[dict]:
    """STUB: Load existing teams from the current JSON file."""
    path = OUTPUT_DIR / f"{league_id}.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)["teams"]
    return []


def fetch_matches_stub(league_id: str) -> list[dict]:
    """STUB: Load existing gameweeks from the current JSON file."""
    path = OUTPUT_DIR / f"{league_id}.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)["gameweeks"]
    return []


def get_current_gameweek_stub(league_id: str) -> int:
    """STUB: Return current GW from existing file."""
    path = OUTPUT_DIR / f"{league_id}.json"
    if path.exists():
        with open(path) as f:
            return json.load(f).get("currentGameweek", 1)
    return 1


# ── Real fetch functions (implement these) ─────────────────────────────────────

def fetch_from_football_data_org(league_id: str, config: dict) -> dict:
    """
    Fetch data from football-data.org.
    Requires API_KEY to be set.

    Endpoint: GET https://api.football-data.org/v4/competitions/{code}/matches
              GET https://api.football-data.org/v4/competitions/{code}/teams

    Uncomment and implement when ready.
    """
    raise NotImplementedError(
        "Implement fetch_from_football_data_org() with real HTTP calls. "
        "See: https://www.football-data.org/documentation/quickstart"
    )
    # import urllib.request
    # headers = {"X-Auth-Token": API_KEY}
    # base = "https://api.football-data.org/v4"
    # code = config["football_data_code"]
    # season_year = config["season"].split("-")[0]
    #
    # # Fetch teams
    # req = urllib.request.Request(f"{base}/competitions/{code}/teams?season={season_year}", headers=headers)
    # with urllib.request.urlopen(req) as resp:
    #     teams_raw = json.loads(resp.read())["teams"]
    #
    # # Fetch matches
    # req = urllib.request.Request(f"{base}/competitions/{code}/matches?season={season_year}", headers=headers)
    # with urllib.request.urlopen(req) as resp:
    #     matches_raw = json.loads(resp.read())["matches"]
    #
    # # Transform to our schema...


def fetch_from_api_football(league_id: str, config: dict) -> dict:
    """
    Fetch data from api-football (RapidAPI).
    Requires API_KEY to be set.

    See: https://www.api-football.com/documentation-v3

    Uncomment and implement when ready.
    """
    raise NotImplementedError(
        "Implement fetch_from_api_football() with real HTTP calls. "
        "See: https://www.api-football.com/documentation-v3"
    )


# ── Main update logic ──────────────────────────────────────────────────────────

def update_league(league_id: str, use_stub: bool = False) -> None:
    config = LEAGUE_CONFIG.get(league_id)
    if not config:
        print(f"Unknown league: {league_id}", file=sys.stderr)
        sys.exit(1)

    print(f"Updating {config['name']}…")

    if use_stub or not API_KEY:
        print("  ⚠ No API_KEY set or --stub flag used. Using existing stub data.")
        teams = fetch_teams_stub(league_id)
        gameweeks = fetch_matches_stub(league_id)
        current_gw = get_current_gameweek_stub(league_id)
    else:
        if API_PROVIDER == "football-data":
            result = fetch_from_football_data_org(league_id, config)
        elif API_PROVIDER == "api-football":
            result = fetch_from_api_football(league_id, config)
        else:
            print(f"Unknown API_PROVIDER: {API_PROVIDER}", file=sys.stderr)
            sys.exit(1)

        teams = result["teams"]
        gameweeks = result["gameweeks"]
        current_gw = result["currentGameweek"]

    output = {
        "leagueId": league_id,
        "leagueName": config["name"],
        "season": config["season"],
        "currentGameweek": current_gw,
        "totalGameweeks": config["totalGameweeks"],
        "teams": teams,
        "gameweeks": gameweeks,
    }

    out_path = OUTPUT_DIR / f"{league_id}.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"  ✓ Written to {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Update football luck table data")
    parser.add_argument("--league", choices=list(LEAGUE_CONFIG.keys()), help="Update a specific league")
    parser.add_argument("--all", action="store_true", help="Update all leagues")
    parser.add_argument("--stub", action="store_true", help="Use stub data (no API calls)")
    args = parser.parse_args()

    if not args.all and not args.league:
        parser.print_help()
        sys.exit(0)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    leagues_to_update = list(LEAGUE_CONFIG.keys()) if args.all else [args.league]
    for league_id in leagues_to_update:
        update_league(league_id, use_stub=args.stub)

    print("\nDone.")


if __name__ == "__main__":
    main()
