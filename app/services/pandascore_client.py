# app/services/pandascore_client.py
import httpx
import os
from typing import List, Dict
from datetime import datetime, timedelta

class PandaScoreClient:
    BASE_URL = "https://api.pandascore.co/dota2"
    
    def __init__(self):
        self.api_key = os.getenv("PANDASCORE_API_KEY", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
    
    def get_fallback_tournaments(self, status: str = "upcoming") -> List[Dict]:
        """Fallback турніри для коли API недоступен"""
        base_image = "https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/blog/ti12_winner/ti12_winner_header.jpg"
        
        if status == "upcoming":
            return [
                {
                    "id": 1,
                    "name": "The International 2026",
                    "date": (datetime.now() + timedelta(days=180)).isoformat(),
                    "location": "Copenhagen",
                    "prize_pool": 40000000,
                    "teams_count": 18,
                    "image": base_image,
                    "status": "upcoming",
                    "winner": "TBA"
                },
                {
                    "id": 2,
                    "name": "ESL Pro League Season 21",
                    "date": (datetime.now() + timedelta(days=30)).isoformat(),
                    "location": "Online",
                    "prize_pool": 1000000,
                    "teams_count": 16,
                    "image": base_image,
                    "status": "upcoming",
                    "winner": "TBA"
                },
                {
                    "id": 3,
                    "name": "PGL Major 2026",
                    "date": (datetime.now() + timedelta(days=60)).isoformat(),
                    "location": "Stockholm",
                    "prize_pool": 2000000,
                    "teams_count": 16,
                    "image": base_image,
                    "status": "upcoming",
                    "winner": "TBA"
                },
            ]
        else:  # completed
            return [
                {
                    "id": 101,
                    "name": "The International 2025",
                    "date": (datetime.now() - timedelta(days=180)).isoformat(),
                    "location": "Copenhagen",
                    "prize_pool": 40000000,
                    "teams_count": 18,
                    "image": base_image,
                    "status": "completed",
                    "winner": "Team Spirit"
                },
                {
                    "id": 102,
                    "name": "ESL Pro League Season 20",
                    "date": (datetime.now() - timedelta(days=60)).isoformat(),
                    "location": "Online",
                    "prize_pool": 1000000,
                    "teams_count": 16,
                    "image": base_image,
                    "status": "completed",
                    "winner": "Liquid"
                },
            ]
    
    def get_fallback_matches(self) -> List[Dict]:
        """Fallback матчи для коли API недоступен"""
        base_image = "https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/blog/ti12_winner/ti12_winner_header.jpg"
        
        return [
            {
                "id": 1001,
                "tournament": "ESL Pro League Season 21",
                "team1": "Team Spirit",
                "team2": "Evil Geniuses",
                "datetime": (datetime.now() + timedelta(hours=2)).isoformat(),
                "bo": "BO3",
                "status": "upcoming",
                "image": base_image
            },
            {
                "id": 1002,
                "tournament": "ESL Pro League Season 21",
                "team1": "PSG.LGD",
                "team2": "Fnatic",
                "datetime": (datetime.now() + timedelta(hours=6)).isoformat(),
                "bo": "BO3",
                "status": "upcoming",
                "image": base_image
            },
        ]

    def _extract_winner_name(self, tournament_data: Dict, team_names_map: Dict = None) -> str:
        """Витягує ім'я переможця з різних можливих локацій у даних турніру"""
        team_names_map = team_names_map or {}
        
        # Спосіб 1: Прямо у winner_id як об'єкт з 'name'
        winner_id = tournament_data.get("winner_id")
        if isinstance(winner_id, dict) and "name" in winner_id:
            return winner_id["name"]
        
        # Спосіб 2: Числовий winner_id - шукаємо в map
        if isinstance(winner_id, (int, str)) and winner_id:
            try:
                id_int = int(winner_id) if isinstance(winner_id, str) else winner_id
                if id_int in team_names_map:
                    return team_names_map[id_int]
            except (ValueError, TypeError):
                pass
        
        # Спосіб 3: У serie.winner_id як об'єкт
        serie = tournament_data.get("serie")
        if isinstance(serie, dict):
            serie_winner = serie.get("winner_id")
            if isinstance(serie_winner, dict) and "name" in serie_winner:
                return serie_winner["name"]
            # Спосіб 4: У serie.winner_id як число
            if isinstance(serie_winner, (int, str)) and serie_winner:
                try:
                    id_int = int(serie_winner) if isinstance(serie_winner, str) else serie_winner
                    if id_int in team_names_map:
                        return team_names_map[id_int]
                except (ValueError, TypeError):
                    pass
        
        # Спосіб 5: Перевіримо first_tournament (іноді це вкладена структура)
        tournaments = tournament_data.get("tournaments", [])
        if isinstance(tournaments, list) and len(tournaments) > 0:
            first_tournament = tournaments[0]
            if isinstance(first_tournament, dict):
                first_winner = first_tournament.get("winner_id")
                if isinstance(first_winner, dict) and "name" in first_winner:
                    return first_winner["name"]
                # Також перевіримо у map
                if isinstance(first_winner, (int, str)) and first_winner:
                    try:
                        id_int = int(first_winner) if isinstance(first_winner, str) else first_winner
                        if id_int in team_names_map:
                            return team_names_map[id_int]
                    except (ValueError, TypeError):
                        pass
        
        # Спосіб 6: Перевіримо serie.tournaments[0] (вкладена структура)
        if isinstance(serie, dict):
            serie_tournaments = serie.get("tournaments", [])
            if isinstance(serie_tournaments, list) and len(serie_tournaments) > 0:
                serie_first = serie_tournaments[0]
                if isinstance(serie_first, dict):
                    serie_t_winner = serie_first.get("winner_id")
                    if isinstance(serie_t_winner, dict) and "name" in serie_t_winner:
                        return serie_t_winner["name"]
                    # Також перевіримо у map
                    if isinstance(serie_t_winner, (int, str)) and serie_t_winner:
                        try:
                            id_int = int(serie_t_winner) if isinstance(serie_t_winner, str) else serie_t_winner
                            if id_int in team_names_map:
                                return team_names_map[id_int]
                        except (ValueError, TypeError):
                            pass
        
        # Якщо нічого не знайшли - перевіримо чи турнір завершен
        # Якщо не завершен - показуємо статус
        status = tournament_data.get("status", "").lower()
        if "live" in status or "ongoing" in status or "running" in status:
            return "Матч в процесі 🔴"
        
        return "Результат відсутній"
    
    def _extract_prizepool(self, tournament_data: Dict) -> any:
        """Витягує призовий фонд з різних можливих локацій"""
        # Спосіб 1: Прямо у tournament
        prizepool = tournament_data.get("prizepool")
        if prizepool:
            return prizepool
        
        # Спосіб 2: У serie
        serie = tournament_data.get("serie")
        if isinstance(serie, dict):
            return serie.get("prizepool")
        
        # Спосіб 3: У першому tournament
        tournaments = tournament_data.get("tournaments", [])
        if isinstance(tournaments, list) and len(tournaments) > 0:
            return tournaments[0].get("prizepool")
        
        return None
    
    def _extract_teams_count(self, tournament_data: Dict) -> int:
        """Витягує кількість команд з різних можливих локацій"""
        # Спосіб 1: У tournaments array
        tournaments = tournament_data.get("tournaments", [])
        if isinstance(tournaments, list) and len(tournaments) > 0:
            first = tournaments[0]
            if isinstance(first, dict):
                teams = first.get("teams", [])
                if teams and len(teams) > 0:
                    return len(teams)
        
        # Спосіб 2: У serie.tournaments
        serie = tournament_data.get("serie")
        if isinstance(serie, dict):
            tournaments = serie.get("tournaments", [])
            if isinstance(tournaments, list) and len(tournaments) > 0:
                first = tournaments[0]
                if isinstance(first, dict):
                    teams = first.get("teams", [])
                    if teams and len(teams) > 0:
                        return len(teams)
        
        return 0

    async def _fetch_team_names(self, client: httpx.AsyncClient, team_ids: List[int]) -> Dict[int, str]:
        """Пакетне завантаження назв команд за їх ID"""
        if not team_ids:
            return {}
        
        unique_ids = list(set([tid for tid in team_ids if tid is not None]))
        if not unique_ids:
            return {}
            
        ids_str = ",".join(map(str, unique_ids))
        try:
            resp = await client.get(
                f"{self.BASE_URL}/teams",
                headers=self.headers,
                params={"filter[id]": ids_str}
            )
            if resp.status_code == 200:
                teams_data = resp.json()
                result = {t["id"]: t["name"] for t in teams_data}
                print(f"[PandaScore DEBUG] Завантажені команди: {result}")
                return result
        except Exception as e:
            print(f"[PandaScore] Помилка завантаження імен команд: {e}")
        return {}

    async def get_upcoming_tournaments(self) -> List[Dict]:
        try:
            if not self.api_key:
                return self.get_fallback_tournaments("upcoming")
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/series/upcoming",
                    headers=self.headers,
                    params={"sort": "begin_at", "per_page": 10},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    print(f"[PandaScore DEBUG] RAW найближчі турніри ({len(data)} шт): {data[:2]}")
                    formatted = self._format_tournaments(data, "upcoming")
                    return formatted if formatted else self.get_fallback_tournaments("upcoming")
        except Exception as e:
            print(f"[PandaScore] Помилка отримання турнірів: {e}")
        
        return self.get_fallback_tournaments("upcoming")

    async def get_past_tournaments(self) -> List[Dict]:
        try:
            if not self.api_key:
                return self.get_fallback_tournaments("completed")
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/series/past",
                    headers=self.headers,
                    params={"sort": "-end_at", "per_page": 10},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    
                    # Логування для отладки
                    with open("debug_tournaments.log", "w", encoding="utf-8") as f:
                        f.write(f"RAW API Відповідь ({len(data)} турнірів):\n\n")
                        for i, t in enumerate(data[:3]):
                            f.write(f"=== Турнір {i+1} ===\n")
                            f.write(f"ID: {t.get('id')}\n")
                            f.write(f"Full Name: {t.get('full_name')}\n")
                            f.write(f"Winner ID (тип {type(t.get('winner_id')).__name__}): {t.get('winner_id')}\n")
                            f.write(f"Prizepool: {t.get('prizepool')}\n")
                            if t.get('serie'):
                                f.write(f"Serie Winner ID: {t['serie'].get('winner_id')}\n")
                            f.write("\n")
                    
                    # Збираємо ID всіх переможців
                    winner_ids = []
                    for t in data:
                        winner_id = t.get("winner_id")
                        if winner_id and isinstance(winner_id, int):
                            winner_ids.append(winner_id)
                    
                    print(f"[PandaScore] Завершені турніри ({len(data)} шт), Winner IDs для fetch: {winner_ids}")
                    team_names_map = await self._fetch_team_names(client, winner_ids)
                    
                    formatted = self._format_tournaments(data, "completed", team_names_map)
                    return formatted if formatted else self.get_fallback_tournaments("completed")
        except Exception as e:
            print(f"[PandaScore] Помилка отримання завершених турнірів: {e}")
        
        return self.get_fallback_tournaments("completed")

    async def get_upcoming_matches(self) -> List[Dict]:
        try:
            if not self.api_key:
                return self.get_fallback_matches()
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/matches/upcoming",
                    headers=self.headers,
                    params={"sort": "begin_at", "per_page": 15},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    matches = []
                    for m in data:
                        opponents = m.get("opponents", [])
                        team1 = opponents[0]["opponent"]["name"] if len(opponents) > 0 else "TBD"
                        team2 = opponents[1]["opponent"]["name"] if len(opponents) > 1 else "TBD"
                        
                        league = m.get("league", {})
                        image = league.get("image_url") or "https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/blog/ti12_winner/ti12_winner_header.jpg"
                        
                        matches.append({
                            "id": m.get("id"),
                            "tournament": f"{league.get('name', 'Pro Match')} {m.get('serie', {}).get('name', '')}".strip(),
                            "team1": team1,
                            "team2": team2,
                            "datetime": m.get("begin_at"),
                            "bo": f"BO{m.get('number_of_games', 3)}",
                            "status": "upcoming",
                            "image": image
                        })
                    return matches if matches else self.get_fallback_matches()
        except Exception as e:
            print(f"[PandaScore] Помилка отримання матчів: {e}")
        
        return self.get_fallback_matches()

    def _format_tournaments(self, raw_data: List[Dict], status: str, team_names_map: Dict[int, str] = None) -> List[Dict]:
        formatted = []
        team_names_map = team_names_map or {}
        default_image = "https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/blog/ti12_winner/ti12_winner_header.jpg"
        
        for t in raw_data:
            league = t.get("league", {})
            league_name = league.get('name', '').strip()
            full_name = t.get('full_name', '').strip()
            
            # 🔥 УЛУЧШЕННОЕ ФОРМИРОВАНИЕ ИМЕНИ: league name СНАЧАЛА для лучшего поиска в БД
            if league_name and full_name:
                name = f"{league_name} {full_name}"
            elif league_name:
                name = league_name
            elif full_name:
                name = full_name
            else:
                name = t.get('name', 'Unknown Tournament')
            
            # Обробка переможця - використовуємо нову функцію
            winner_name = "TBA"
            if status == "completed":
                winner_name = self._extract_winner_name(t, team_names_map)
            
            # Обробка призу - використовуємо нову функцію
            prizepool = self._extract_prizepool(t)
            
            # Обробка кількості команд - використовуємо нову функцію
            teams_count = self._extract_teams_count(t)
            
            # Зображення
            image = league.get("image_url") or t.get("image_url") or default_image
            if not image or image == "":
                image = default_image
            
            formatted.append({
                "id": t.get("id"),
                "name": name,
                "date": t.get("begin_at"),
                "location": t.get("tier", "Online").capitalize(),
                "prize_pool": prizepool,
                "teams_count": teams_count if teams_count > 0 else "TBA",
                "image": image,
                "status": status,
                "winner": winner_name
            })
        
        return formatted