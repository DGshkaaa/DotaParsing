import httpx
from typing import List, Dict

class OpenDotaClient:
    """Сервіс для взаємодії з OpenDota API (Інкапсуляція)"""
    BASE_URL = "https://api.opendota.com/api"
    def __init__(self, api_key: str = None):
        self.base_url = "https://api.opendota.com/api"
        self.api_key = api_key
        self.client = httpx.AsyncClient()

    async def fetch_hero_stats(self) -> List[Dict]:
        """Отримати статистику всіх героїв"""
        response = await self.client.get(f"{self.base_url}/heroStats")
        response.raise_for_status()
        return response.json()

    async def fetch_all_items(self) -> Dict:
        """Отримати всі предмети"""
        async with httpx.AsyncClient(timeout=20.0) as client:
            url = f"{self.BASE_URL}/items"
            response = await client.get(url)
            if response.status_code == 200:
                return response.json()
            return {}

    async def get_player_matches(self, steam_id: int):
        """Отримати матчі конкретного гравця"""
        response = await self.client.get(f"{self.base_url}/players/{steam_id}/matches")
        return response.json()


    async def fetch_player_profile(self, steam_id_64: str):
            """Отримує дані профілю: нік, аватар, ранг"""
            steam_id_32 = int(steam_id_64) - 76561197960265728
            async with httpx.AsyncClient(timeout=20.0) as client:
                url = f"{self.BASE_URL}/players/{steam_id_32}"
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
                return None


    async def fetch_user_matches(self, steam_id_64: str):
            """Отримує всі матчі гравця (до 2000) за його SteamID64"""
            try:
                steam_id_32 = int(steam_id_64) - 76561197960265728
                print(f"[OpenDota] Завантаження матчів для SteamID64={steam_id_64}, SteamID32={steam_id_32}")
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    url = f"{self.BASE_URL}/players/{steam_id_32}/matches?limit=15000"
                    response = await client.get(url)
                    if response.status_code == 200:
                        matches = response.json()
                        print(f"[OpenDota] Отримано {len(matches)} матчів")
                        if matches:
                            print(f"[OpenDota] Перший матч: match_id={matches[0].get('match_id')}")
                        return matches if matches else []
                    elif response.status_code == 404:
                        print(f"[OpenDota] Гравець {steam_id_32} не знайдено")
                        return []
                    else:
                        print(f"[OpenDota] Помилка API: {response.status_code}")
                        return []
            except Exception as e:
                print(f"[OpenDota] Помилка: {e}")
                return []
            
    async def get_top_meta_heroes(self):
        """Аналітична обробка: вибір найкращих героїв за вінрейтом"""
        heroes = await self.fetch_hero_stats()
        
        # Сортуємо за вінрейтом (професійні матчі)
        # Принцип: Обробка масивів даних
        sorted_heroes = sorted(
            heroes, 
            key=lambda x: (x.get('pro_win', 0) / x.get('pro_pick', 1)) if x.get('pro_pick', 0) > 0 else 0, 
            reverse=True
        )
        
        return sorted_heroes[:10] # Повертаємо топ-10