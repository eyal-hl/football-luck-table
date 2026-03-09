#!/usr/bin/env python3
"""
Helper to find the correct AllSportsApi league ID for Ligat Ha'al.
Usage: python scripts/find_allsports_league.py
"""
import json, os, re, sys, urllib.request
from pathlib import Path

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

API_KEY = os.environ.get("ALLSPORTS_API_KEY", "")
if not API_KEY:
    print("Set ALLSPORTS_API_KEY in .env first.")
    sys.exit(1)

url = f"https://apiv2.allsportsapi.com/football/?met=Leagues&APIkey={API_KEY}"
with urllib.request.urlopen(url, timeout=15) as resp:
    data = json.loads(resp.read())

leagues = data.get("result") or []
print(f"Found {len(leagues)} leagues. Searching for Israel...\n")
for lg in leagues:
    country = lg.get("country_name", "")
    name    = lg.get("league_name", "")
    if "israel" in country.lower() or "israel" in name.lower() or "ligat" in name.lower():
        print(f"  ID={lg.get('league_key')}  |  {name}  |  {country}")
