import httpx
from typing import List, Dict, Optional
from datetime import datetime
import re
import asyncio

class LiquipediaClient:
    """Клієнт для отримання дат турнірів та інформації з Liquipedia"""
    
    BASE_URL = "https://liquipedia.net/dota2"
    API_URL = "https://liquipedia.net/api.php"
    
    def __init__(self):
        self.session_headers = {
            "User-Agent": "DotaAnalytics Bot 1.0",
            "Accept": "application/json"
        }
        self._cache = {}
    
    def _get_cache_key(self, name: str) -> str:
        return name.lower().strip()
    
    def _get_from_cache(self, name: str) -> Optional[Dict]:
        key = self._get_cache_key(name)
        if key in self._cache:
            cached_time, cached_data = self._cache[key]
            if (datetime.now() - cached_time).total_seconds() < 86400:
                return cached_data
        return None
    
    def _set_cache(self, name: str, data: Dict):
        key = self._get_cache_key(name)
        self._cache[key] = (datetime.now(), data)
    
    async def get_tournament_by_name(self, tournament_name: str, date: Optional[str] = None) -> Optional[Dict]:
        """Отримання інформації про турнір за назвою"""
        cached = self._get_from_cache(tournament_name)
        if cached:
            return cached
        
        try:
            async with httpx.AsyncClient(headers=self.session_headers, timeout=2.0) as client:
                search_query = tournament_name
                if date:
                    year_match = re.search(r'(\d{4})', date)
                    if year_match:
                        search_query = f"{tournament_name} {year_match.group(1)}"
                
                # Спробуємо отримати деталі з Liquipedia
                params = {
                    "action": "query",
                    "titles": search_query,
                    "prop": "extracts|pageimages",
                    "explaintext": True,
                    "format": "json"
                }
                
                response = await client.get(self.API_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    pages = data.get("query", {}).get("pages", {})
                    
                    if pages:
                        page = list(pages.values())[0]
                        if "extract" in page and page["extract"]:
                            tournament_info = self._parse_tournament(page, search_query)
                            self._set_cache(tournament_name, tournament_info)
                            return tournament_info
        
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            print(f"[Liquipedia] Помилка: {e}")
        
        return None
    
    def _parse_tournament(self, page: Dict, title: str) -> Dict:
        """Парсинг інформації про турнір"""
        extract = page.get("extract", "")
        
        return {
            "name": title,
            "liquipedia_url": f"{self.BASE_URL}/{title.replace(' ', '_')}",
            "image": page.get("thumbnail", {}).get("source"),
            "prize_pool": self._extract_prize_pool(extract),
            "location": self._extract_location(extract),
            "teams_count": self._extract_teams_count(extract),
            "winner": self._extract_winner(extract),
        }
    
    def _extract_prize_pool(self, text: str) -> Optional[str]:
        patterns = [
            r'[Pp]rize\s+[Pp]ool[:\s]*\$?([\d,]+(?:\s*(?:million|thousand|USD|k))?)',
            r'\$?([\d,]+(?:\s*(?:million|thousand))?)\s+USD',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_location(self, text: str) -> Optional[str]:
        patterns = [
            r'[Ll]ocation[:\s]*([^\n.]+)',
            r'held\s+(?:in|at)\s+([^\n.]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                return re.sub(r'[,;.]', '', location)[:50]
        
        return None
    
    def _extract_teams_count(self, text: str) -> Optional[int]:
        patterns = [
            r'(\d+)\s+teams?',
            r'[Pp]articipants?[:\s]*(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    return int(match.group(1))
                except:
                    pass
        
        return None
    
    def _extract_winner(self, text: str) -> Optional[str]:
        """Витягує переможця з тексту турніру"""
        patterns = [
            # Класичні патерни
            r'[Ww]inner[:\s]+([A-Za-z\s\-\.]+?)(?:\n|$|,|\.|;)',
            r'[Cc]hampion[:\s]+([A-Za-z\s\-\.]+?)(?:\n|$|,|\.|;)',
            # Патерни з емодзі та спеціальними символами
            r'🏆\s*([A-Za-z\s\-\.]+?)(?:\n|$|,|\.|;)',
            # За структурою результатів турнірів
            r'(?:First place|1st Place|1st place)[:\s]+([A-Za-z\s\-\.]+?)(?:\n|$|,|\.|;)',
            # Пошук командних назв
            r'(?:defeated|beat|vs\.?)\s+(?:team\s+)?([A-Za-z0-9\s\-\.]+?)\s+(?:in|to|at)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                winner = match.group(1).strip()
                # Очистка від непотрібних символів
                winner = re.sub(r'[\[\](){}]', '', winner).strip()
                winner = re.sub(r'\s+', ' ', winner)  # Нормалізація пробілів
                
                # Перевіримо, чи це не мале слово (вірогідно помилка)
                if len(winner) > 2 and len(winner) < 200:
                    return winner
        
        return None
