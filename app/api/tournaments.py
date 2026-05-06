# app/api/tournaments.py
from fastapi import APIRouter
from datetime import datetime
import httpx
import asyncio

# Імпортуємо наші клієнти
from app.services.pandascore_client import PandaScoreClient
from app.services.liquipedia_client import LiquipediaClient
from app.services.tournament_db import get_tournament_info

router = APIRouter(prefix="/tournaments", tags=["tournaments"])
OPENDOTA_API = "https://api.opendota.com/api"

# Створюємо інстанси клієнтів
pandascore = PandaScoreClient()
liquipedia = LiquipediaClient()

# ========== ФУНКЦІЇ ДЛЯ ЗБАГАЧЕННЯ ДАНИХ ==========
def is_tba(value) -> bool:
    """Перевіряє, чи значення - це TBA"""
    if value is None:
        return True
    if isinstance(value, str):
        return value.lower() in ["tba", "н/д", "невідомо", "unknown", "результат відсутній", "матч в процесі 🔴"]
    return False

async def enrich_tournament_with_liquipedia(tournament: dict) -> dict:
    """Збагачує дані турніру з локальної БД + Liquipedia"""
    tournament_name = tournament.get("name", "")
    
    # 1. СПОЧАТКУ перевіряємо локальну БД
    db_info = get_tournament_info(tournament_name)
    if db_info:
        # Оновлюємо всі доступні поля з БД
        if db_info.get("prize_pool") and is_tba(tournament.get("prize_pool")):
            tournament["prize_pool"] = db_info["prize_pool"]
        
        if db_info.get("location") and tournament.get("location") == "Online":
            if db_info.get("location") and db_info["location"] != "Online":
                tournament["location"] = db_info["location"]
        
        if db_info.get("teams_count") and is_tba(tournament.get("teams_count")):
            tournament["teams_count"] = db_info["teams_count"]
        
        # 🔥 НАЙВАЖЛИВІШЕ: Витягуємо переможця з локальної БД
        if db_info.get("winner") and is_tba(tournament.get("winner")):
            tournament["winner"] = db_info["winner"]
            print(f"✅ [DB] '{tournament_name}' → Переможець: {db_info['winner']}, Приз: {db_info.get('prize_pool')}, Команди: {db_info.get('teams_count')}")
        else:
            print(f"✅ [DB] '{tournament_name}' → Приз: {db_info.get('prize_pool')}, Місце: {db_info.get('location')}, Команди: {db_info.get('teams_count')}")
    else:
        print(f"❌ [DB] '{tournament_name}' НЕ ЗНАЙДЕНО в БД, шукаємо в Liquipedia...")
    
    # 2. Якщо переможець все ще не знайдено, спробуємо Liquipedia (як резервний варіант)
    if tournament_name and len(tournament_name) > 3 and is_tba(tournament.get("winner")):
        try:
            liquipedia_data = await asyncio.wait_for(
                liquipedia.get_tournament_by_name(tournament_name),
                timeout=2.0  # Коротший timeout, оскільки БД найважливіша
            )
            
            if liquipedia_data and liquipedia_data.get("winner"):
                tournament["winner"] = liquipedia_data["winner"]
                print(f"🔍 [Liquipedia] Знайдено переможця для {tournament_name}: {liquipedia_data['winner']}")
        
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            pass
    
    return tournament

async def enrich_tournaments_list(tournaments: list) -> list:
    """Збагачує список турнірів з БД та Liquipedia"""
    try:
        tasks = [enrich_tournament_with_liquipedia(t) for t in tournaments]
        enriched = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True),
            timeout=10.0  # Скорочений timeout, оскільки БД дуже швидка
        )
        return [e if isinstance(e, dict) else t for t, e in zip(tournaments, enriched)]
    except asyncio.TimeoutError:
        print("[API] Timeout при обогащенні списку турнірів")
        return tournaments
    except Exception as e:
        print(f"[API] Помилка при обогащенні списку: {e}")
        return tournaments

# ========== FALLBACK ДАНІ ==========
def get_fallback_teams():
    """Fallback команди для коли OpenDota недоступна"""
    default_logo = "https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png"
    return [
        {
            "id": 1,
            "name": "Team Spirit",
            "rating": 8950,
            "wins": 245,
            "losses": 67,
            "logo": default_logo,
            "region": "CIS 🇷🇺",
            "players": [
                {"id": "1", "steam_id": "1", "name": "Collapse", "role": "Offerer", "photo": None, "avatar_url": None},
                {"id": "2", "steam_id": "2", "name": "Yatoro", "role": "Carry", "photo": None, "avatar_url": None},
                {"id": "3", "steam_id": "3", "name": "TORONTOTOKYO", "role": "Mid", "photo": None, "avatar_url": None},
                {"id": "4", "steam_id": "4", "name": "Miposhka", "role": "Support", "photo": None, "avatar_url": None},
                {"id": "5", "steam_id": "5", "name": "DM", "role": "Support", "photo": None, "avatar_url": None},
            ]
        },
        {
            "id": 2,
            "name": "Evil Geniuses",
            "rating": 8890,
            "wins": 233,
            "losses": 74,
            "logo": default_logo,
            "region": "NA 🇺🇸",
            "players": [
                {"id": "6", "steam_id": "6", "name": "Arteezy", "role": "Carry", "photo": None, "avatar_url": None},
                {"id": "7", "steam_id": "7", "name": "Abed", "role": "Mid", "photo": None, "avatar_url": None},
                {"id": "8", "steam_id": "8", "name": "Cr1t-", "role": "Support", "photo": None, "avatar_url": None},
                {"id": "9", "steam_id": "9", "name": "Jerax", "role": "Support", "photo": None, "avatar_url": None},
                {"id": "10", "steam_id": "10", "name": "Flyby", "role": "Offlane", "photo": None, "avatar_url": None},
            ]
        },
        {
            "id": 3,
            "name": "PSG.LGD",
            "rating": 8850,
            "wins": 228,
            "losses": 76,
            "logo": default_logo,
            "region": "China 🇨🇳",
            "players": [
                {"id": "11", "steam_id": "11", "name": "NothingToSay", "role": "Carry", "photo": None, "avatar_url": None},
                {"id": "12", "steam_id": "12", "name": "Somnus", "role": "Mid", "photo": None, "avatar_url": None},
                {"id": "13", "steam_id": "13", "name": "Faith_bian", "role": "Offlane", "photo": None, "avatar_url": None},
                {"id": "14", "steam_id": "14", "name": "Kaka", "role": "Support", "photo": None, "avatar_url": None},
                {"id": "15", "steam_id": "15", "name": "xiao8", "role": "Support", "photo": None, "avatar_url": None},
            ]
        },
        {
            "id": 4,
            "name": "Liquid",
            "rating": 8800,
            "wins": 220,
            "losses": 78,
            "logo": default_logo,
            "region": "EU 🇪🇺",
            "players": [
                {"id": "16", "steam_id": "16", "name": "Nisha", "role": "Carry", "photo": None, "avatar_url": None},
                {"id": "17", "steam_id": "17", "name": "Qojqva", "role": "Mid", "photo": None, "avatar_url": None},
                {"id": "18", "steam_id": "18", "name": "Taiga", "role": "Offlane", "photo": None, "avatar_url": None},
                {"id": "19", "steam_id": "19", "name": "MarineLord", "role": "Support", "photo": None, "avatar_url": None},
                {"id": "20", "steam_id": "20", "name": "GH", "role": "Support", "photo": None, "avatar_url": None},
            ]
        },
    ]

@router.get("/upcoming")
async def get_upcoming_tournaments():
    """Реальні найближчі турніри з PandaScore + Liquipedia"""
    tournaments = await pandascore.get_upcoming_tournaments()
    # Збагачуємо дані з Liquipedia для заповнення TBA
    enriched = await enrich_tournaments_list(tournaments)
    return enriched

@router.get("/recent")
async def get_recent_tournaments():
    """Реальні завершені турніри з PandaScore + Liquipedia"""
    tournaments = await pandascore.get_past_tournaments()
    # Збагачуємо дані з Liquipedia для заповнення TBA
    enriched = await enrich_tournaments_list(tournaments)
    return enriched

@router.get("/matches")
async def get_upcoming_matches(limit: int = 15):
    """Реальний розклад матчів з PandaScore"""
    matches = await pandascore.get_upcoming_matches()
    return matches[:limit]

@router.get("/teams")
async def get_top_teams(limit: int = 12):
    """Отримати топ-команди світу з OpenDota + Steam Аватарки гравців"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OPENDOTA_API}/teams", timeout=15.0)
            if response.status_code == 200:
                teams = response.json()
                if not teams:
                    return get_fallback_teams()[:limit]
                    
                sorted_teams = sorted(teams, key=lambda x: x.get('rating', 0), reverse=True)[:limit]
                
                async def fetch_players(team_id):
                    try:
                        p_resp = await client.get(f"{OPENDOTA_API}/teams/{team_id}/players", timeout=10.0)
                        if p_resp.status_code == 200:
                            p_data = p_resp.json()
                            current_players = [p for p in p_data if p.get("is_current_team_member")]
                            
                            formatted_players = []
                            for p in current_players:
                                account_id = str(p.get("account_id"))
                                avatar_url = p.get("avatar") or None
                                
                                formatted_players.append({
                                    "id": account_id,
                                    "steam_id": account_id,
                                    "name": p.get("name") or "Player",
                                    "role": "Player", 
                                    "photo": avatar_url,
                                    "avatar_url": avatar_url
                                })
                            return formatted_players
                    except Exception as e:
                        print(f"Error fetching players for {team_id}: {e}")
                    return []

                tasks = [fetch_players(t.get("team_id")) for t in sorted_teams]
                players_lists = await asyncio.gather(*tasks)
                
                region_map = {
                    'Team Spirit': 'CIS 🇷🇺', 'PSG.LGD': 'China 🇨🇳', 'Evil Geniuses': 'NA 🇺🇸',
                    'Fnatic': 'SEA 🇵🇭', 'Liquid': 'EU 🇪🇺', 'Secret': 'EU 🇪🇺', 'OG': 'EU 🇪🇺',
                    'Virtus.pro': 'CIS 🇷🇺', 'Na`Vi': 'CIS 🇺🇦', 'Gaimin Gladiators': 'EU 🇪🇺',
                }
                
                result = []
                for t, players in zip(sorted_teams, players_lists):
                    team_name = t.get("name") or "Unknown Team"
                    logo = t.get("logo_url")
                    if not logo:
                        logo = "https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png"
                        
                    region = region_map.get(team_name, "World 🌍")
                        
                    result.append({
                        "id": t.get("team_id"),
                        "name": team_name,
                        "rating": round(t.get("rating", 0)),
                        "wins": t.get("wins", 0),
                        "losses": t.get("losses", 0),
                        "logo": logo,
                        "region": region,
                        "players": players if players else [] 
                    })
                return result if result else get_fallback_teams()[:limit]
    except Exception as e:
        print(f"[Tournaments API] Помилка завантаження команд: {e}")
    
    return get_fallback_teams()[:limit]

@router.get("/stats")
async def get_dota_stats():
    """Глобальна статистика"""
    return {
        "total_tournaments_year": 142,
        "total_prize_pool": 75000000,
        "top_region": "Europe",
        "avg_match_duration": 38.5 
    }