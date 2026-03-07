#!/usr/bin/env python3
"""
Generates stub JSON data for La Liga, Serie A, and Bundesliga.
Run: python3 scripts/generate_stub_data.py
"""
import json
import random
import os
from itertools import permutations

random.seed(42)

LEAGUES = {
    "la-liga": {
        "leagueId": "la-liga",
        "leagueName": "La Liga",
        "season": "2024-25",
        "currentGameweek": 28,
        "totalGameweeks": 38,
        "teams": [
            {"id": "real-madrid", "name": "Real Madrid", "shortName": "RMA", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"},
            {"id": "barcelona", "name": "Barcelona", "shortName": "BAR", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg"},
            {"id": "atletico-madrid", "name": "Atletico Madrid", "shortName": "ATM", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_de_Madrid_2017_logo.svg"},
            {"id": "athletic-bilbao", "name": "Athletic Bilbao", "shortName": "ATH", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_de_Bilbao_logo.svg"},
            {"id": "villarreal", "name": "Villarreal", "shortName": "VIL", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo.svg"},
            {"id": "real-betis", "name": "Real Betis", "shortName": "BET", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg"},
            {"id": "real-sociedad", "name": "Real Sociedad", "shortName": "SOC", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo_2017.svg"},
            {"id": "sevilla", "name": "Sevilla", "shortName": "SEV", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg"},
            {"id": "osasuna", "name": "Osasuna", "shortName": "OSA", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/d/d6/Osasuna_logo.svg"},
            {"id": "valencia", "name": "Valencia", "shortName": "VAL", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg"},
            {"id": "getafe", "name": "Getafe", "shortName": "GET", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/0/05/Getafe_CF.svg"},
            {"id": "rayo-vallecano", "name": "Rayo Vallecano", "shortName": "RAY", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/0/06/Rayo_Vallecano_logo.svg"},
            {"id": "celta-vigo", "name": "Celta Vigo", "shortName": "CEL", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/4/4b/RC_Celta_de_Vigo_logo.svg"},
            {"id": "mallorca", "name": "Mallorca", "shortName": "MAL", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/2/2e/RCD_Mallorca_logo.svg"},
            {"id": "alaves", "name": "Alaves", "shortName": "ALA", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/5/50/Deportivo_Alaves_logo_2020.svg"},
            {"id": "girona", "name": "Girona", "shortName": "GIR", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/6/66/Girona_FC_badge.svg"},
            {"id": "cadiz", "name": "Cadiz", "shortName": "CAD", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/3/31/Logo_Cadiz_CF.svg"},
            {"id": "almeria", "name": "Almeria", "shortName": "ALM", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/8/8a/UD_Almeria.svg"},
            {"id": "granada", "name": "Granada", "shortName": "GRA", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/2/28/Granada_CF.svg"},
            {"id": "las-palmas", "name": "Las Palmas", "shortName": "LPA", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/3/35/UD_Las_Palmas_logo.svg"},
        ],
    },
    "serie-a": {
        "leagueId": "serie-a",
        "leagueName": "Serie A",
        "season": "2024-25",
        "currentGameweek": 28,
        "totalGameweeks": 38,
        "teams": [
            {"id": "inter-milan", "name": "Inter Milan", "shortName": "INT", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg"},
            {"id": "juventus", "name": "Juventus", "shortName": "JUV", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_icon_%28black%29.svg"},
            {"id": "ac-milan", "name": "AC Milan", "shortName": "MIL", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg"},
            {"id": "napoli", "name": "Napoli", "shortName": "NAP", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli.svg"},
            {"id": "roma", "name": "Roma", "shortName": "ROM", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg"},
            {"id": "atalanta", "name": "Atalanta", "shortName": "ATA", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg"},
            {"id": "lazio", "name": "Lazio", "shortName": "LAZ", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/7/71/SS_Lazio_Badge_2017.svg"},
            {"id": "fiorentina", "name": "Fiorentina", "shortName": "FIO", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/archive/a/a2/20200105160218%21ACF_Fiorentina_%282022%29.svg"},
            {"id": "torino", "name": "Torino", "shortName": "TOR", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/4/4a/Torino_FC_1906.svg"},
            {"id": "bologna", "name": "Bologna", "shortName": "BOL", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Bologna_FC_1909_logo.svg"},
            {"id": "udinese", "name": "Udinese", "shortName": "UDI", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/e/e9/Udinese_Calcio_logo_%282015%29.svg"},
            {"id": "genoa", "name": "Genoa", "shortName": "GEN", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Genoa_CFC_logo.svg"},
            {"id": "sassuolo", "name": "Sassuolo", "shortName": "SAS", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/0/03/US_Sassuolo_Calcio_logo.svg"},
            {"id": "monza", "name": "Monza", "shortName": "MON", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/2/25/AC_Monza.svg"},
            {"id": "cagliari", "name": "Cagliari", "shortName": "CAG", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/d/d7/Cagliari_Calcio_1920.svg"},
            {"id": "lecce", "name": "Lecce", "shortName": "LEC", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/9/93/US_Lecce_logo.svg"},
            {"id": "verona", "name": "Verona", "shortName": "VER", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/7/72/Hellas_Verona_FC.svg"},
            {"id": "empoli", "name": "Empoli", "shortName": "EMP", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/e/e7/Empoli_FC_logo.svg"},
            {"id": "frosinone", "name": "Frosinone", "shortName": "FRO", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/c/cd/Frosinone_Calcio.svg"},
            {"id": "salernitana", "name": "Salernitana", "shortName": "SAL", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/a/af/US_Salernitana_1919.svg"},
        ],
    },
    "bundesliga": {
        "leagueId": "bundesliga",
        "leagueName": "Bundesliga",
        "season": "2024-25",
        "currentGameweek": 25,
        "totalGameweeks": 34,
        "teams": [
            {"id": "bayer-leverkusen", "name": "Bayer Leverkusen", "shortName": "LEV", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg"},
            {"id": "borussia-dortmund", "name": "Borussia Dortmund", "shortName": "BVB", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg"},
            {"id": "bayern-munich", "name": "Bayern Munich", "shortName": "BAY", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg"},
            {"id": "rb-leipzig", "name": "RB Leipzig", "shortName": "RBL", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg"},
            {"id": "borussia-mgladbach", "name": "Borussia M'gladbach", "shortName": "BMG", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/8/81/Borussia_M%C3%B6nchengladbach_logo.svg"},
            {"id": "eintracht-frankfurt", "name": "Eintracht Frankfurt", "shortName": "SGE", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/0/04/Eintracht_Frankfurt_Logo.svg"},
            {"id": "vfb-stuttgart", "name": "VfB Stuttgart", "shortName": "VFB", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg"},
            {"id": "sc-freiburg", "name": "SC Freiburg", "shortName": "SCF", "logoUrl": "https://upload.wikimedia.org/wikipedia/de/f/f1/SC-Freiburg_Logo-neu.svg"},
            {"id": "union-berlin", "name": "Union Berlin", "shortName": "FCU", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/4/44/1._FC_Union_Berlin_Logo.svg"},
            {"id": "vfl-wolfsburg", "name": "VfL Wolfsburg", "shortName": "WOB", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Logo-VfL-Wolfsburg.svg"},
            {"id": "werder-bremen", "name": "Werder Bremen", "shortName": "SVW", "logoUrl": "https://upload.wikimedia.org/wikipedia/en/b/be/SV-Werder-Bremen-Logo.svg"},
            {"id": "fc-augsburg", "name": "FC Augsburg", "shortName": "FCA", "logoUrl": "https://upload.wikimedia.org/wikipedia/de/b/b5/Logo_FC_Augsburg.svg"},
            {"id": "vfl-bochum", "name": "VfL Bochum", "shortName": "BOC", "logoUrl": "https://upload.wikimedia.org/wikipedia/de/7/72/VfL_Bochum_logo.svg"},
            {"id": "fc-heidenheim", "name": "FC Heidenheim", "shortName": "HDH", "logoUrl": "https://upload.wikimedia.org/wikipedia/de/2/2e/1._FC_Heidenheim_1846.svg"},
            {"id": "mainz-05", "name": "Mainz 05", "shortName": "M05", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/9/9e/Logo_Mainz_05.svg"},
            {"id": "fc-koln", "name": "FC Koln", "shortName": "KOE", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/5/53/FC_Cologne_logo.svg"},
            {"id": "holstein-kiel", "name": "Holstein Kiel", "shortName": "KIE", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/7/71/Holstein_Kiel_Logo.svg"},
            {"id": "st-pauli", "name": "St. Pauli", "shortName": "STP", "logoUrl": "https://upload.wikimedia.org/wikipedia/commons/4/42/FC_St._Pauli_logo.svg"},
        ],
    },
}


def make_score():
    """Generate a realistic football score."""
    scores = [
        (0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (0, 2),
        (2, 1), (1, 2), (3, 0), (0, 3), (3, 1), (1, 3),
        (2, 2), (3, 2), (2, 3), (4, 0), (0, 4), (4, 1),
        (1, 4), (3, 3), (4, 2), (2, 4),
    ]
    weights = [
        8, 12, 10, 14, 10, 7, 12, 9, 5, 3, 6, 4,
        7, 5, 4, 2, 1, 2, 1, 2, 1, 1,
    ]
    return random.choices(scores, weights=weights, k=1)[0]


def generate_round_robin_schedule(team_ids: list[str]) -> list[list[tuple[str, str]]]:
    """
    Generate a round-robin schedule. Each round has n/2 matches.
    Uses the circle method.
    Returns a list of rounds, each a list of (home, away) tuples.
    """
    n = len(team_ids)
    teams = team_ids[:]
    if n % 2 == 1:
        teams.append("BYE")
        n += 1

    rounds = []
    for _ in range(n - 1):
        round_matches = []
        for i in range(n // 2):
            home = teams[i]
            away = teams[n - 1 - i]
            if home != "BYE" and away != "BYE":
                round_matches.append((home, away))
        rounds.append(round_matches)
        # Rotate: fix first element, rotate rest
        teams = [teams[0]] + [teams[-1]] + teams[1:-1]

    return rounds


def build_gameweeks(league: dict) -> list[dict]:
    team_ids = [t["id"] for t in league["teams"]]
    current_gw = league["currentGameweek"]
    total_gws = league["totalGameweeks"]

    # Generate first-half schedule (round 1 of round-robin)
    first_half = generate_round_robin_schedule(team_ids)

    # Second half: reverse fixtures
    second_half = [[(away, home) for home, away in rnd] for rnd in first_half]

    all_rounds = first_half + second_half
    # Trim/extend to totalGameweeks
    all_rounds = all_rounds[:total_gws]

    gameweeks = []
    for gw_idx, round_matches in enumerate(all_rounds):
        gw_num = gw_idx + 1
        played = gw_num <= current_gw
        matches = []
        for home, away in round_matches:
            if played:
                hg, ag = make_score()
                matches.append({
                    "home": home,
                    "away": away,
                    "homeGoals": hg,
                    "awayGoals": ag,
                    "played": True,
                })
            else:
                matches.append({
                    "home": home,
                    "away": away,
                    "homeGoals": None,
                    "awayGoals": None,
                    "played": False,
                })
        gameweeks.append({"gw": gw_num, "matches": matches})

    return gameweeks


def main():
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "data")
    os.makedirs(output_dir, exist_ok=True)

    for league_id, league in LEAGUES.items():
        league_copy = dict(league)
        league_copy["gameweeks"] = build_gameweeks(league)
        out_path = os.path.join(output_dir, f"{league_id}.json")
        with open(out_path, "w") as f:
            json.dump(league_copy, f, indent=2)
        print(f"Generated {out_path} ({len(league_copy['gameweeks'])} GWs, {len(league_copy['teams'])} teams)")


if __name__ == "__main__":
    main()
