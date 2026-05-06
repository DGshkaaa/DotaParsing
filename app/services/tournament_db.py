

TOURNAMENTS_DB = {
    "DreamLeague Season 29 2026": {
        "prize_pool": "$1,000,000",
        "location": "Europe",
        "teams_count": 16,
        "region": "International",
        "winner": "Team Spirit"
    },
    "BLAST Slam Season 7 2026": {
        "prize_pool": "$1,000,000",
        "location": "Copenhagen", 
        "teams_count": 12,
        "region": "International",
        "winner": "Evil Geniuses"
    },
    "The International 2026": {
        "prize_pool": "$40,000,000",
        "location": "Copenhagen",
        "teams_count": 18,
        "region": "International",
        "winner": None
    },
    "ESL Pro League Season 21": {
        "prize_pool": "$1,000,000",
        "location": "Online",
        "teams_count": 16,
        "region": "International",
        "winner": None
    },
    "PGL Major 2026": {
        "prize_pool": "$2,000,000",
        "location": "Stockholm",
        "teams_count": 16,
        "region": "International",
        "winner": None
    },
    "European Pro League Season 36 2026": {
        "prize_pool": "$20,000",
        "location": "Online",
        "teams_count": 12,
        "region": "Europe",
        "winner": "Team Lynx"
    },
    "ACL X ESL Challenger China Season 3 2026": {
        "prize_pool": "$172,000",
        "location": "Online",
        "teams_count": 8,
        "region": "Asia",
        "winner": "Vici Gaming"
    },
    "PGL Wallachia season 8 2026": {
        "prize_pool": "$1,000,000",
        "location": "Online",
        "teams_count": 16,
        "region": "Europe",
        "winner": "BetBoom Team"
    },
    "EPL World Series Southeast Asia season 14 2026": {
        "prize_pool": "$10,000",
        "location": "Online",
        "teams_count": 8,
        "region": "Asia",
        "winner": "Carstena Esports"
    },
    "CCT Season 2: South America Series 4": {
        "prize_pool": "$20,000",
        "location": "Online",
        "teams_count": 8,
        "region": "South America",
        "winner": "Estard Backs"
    },
    "DreamLeague Division 2 season 4 2026": {
        "prize_pool": "$50,000",
        "location": "Online",
        "teams_count": 16,
        "region": "International",
        "winner": "South America Rejects"
    },
    "DreamLeague South America Closed Qualifier season 29 2026": {
        "prize_pool": "$50,000",
        "location": "Online",
        "teams_count": 8,
        "region": "South America",
        "winner": "Heroic"
    },
    "DreamLeague North America Closed Qualifier season 29 2026": {
        "prize_pool": "$10,000",
        "location": "Online",
        "teams_count": 8,
        "region": "North America",
        "winner": "Gamer Legion"
    },
    "DreamLeague Eastern Europe Closed Qualifier season 29 2026": {
        "prize_pool": "$10,000",
        "location": "Online",
        "teams_count": 8,
        "region": "Eastern Europe",
        "winner": "BetBoom Team" 
    },
    "DreamLeague Western Europe Closed Qualifier season 29 2026": {
        "prize_pool": "$10,000",
        "location": "Online",
        "teams_count": 8,
        "region": "Western Europe",
        "winner": "Natus Vincere"
    },
}

def get_tournament_info(tournament_name: str):
    """Отримати інформацію про турнір з БД"""
    if not tournament_name or tournament_name.strip() == "":
        return None
    
    tournament_name_lower = tournament_name.lower().strip()
    
    # 1. Точний пошук
    if tournament_name in TOURNAMENTS_DB:
        return TOURNAMENTS_DB[tournament_name]
    
    if tournament_name_lower in [k.lower() for k in TOURNAMENTS_DB.keys()]:
        for k, v in TOURNAMENTS_DB.items():
            if k.lower() == tournament_name_lower:
                return v
    
    # 2. Розширений пошук за ключовими словами
    # Витягуємо ключові слова з назви турніру
    keywords = tournament_name_lower.split()
    
    # Ищем турниры, которые содержат все или большинство ключевых слов
    best_match = None
    best_score = 0
    
    for db_name, info in TOURNAMENTS_DB.items():
        db_name_lower = db_name.lower()
        
        # Подсчитываем совпадения ключевых слов
        matches = sum(1 for kw in keywords if kw in db_name_lower and len(kw) > 2)
        
        if matches > best_score:
            best_score = matches
            best_match = info
    
    # Если нашли совпадение хотя бы 2 ключевых слова
    if best_score >= 2:
        return best_match
    
    # 3. Нечіткий пошук - первые значительные слова (исключая слова < 3 символа)
    significant_keywords = [kw for kw in keywords if len(kw) > 3]
    if significant_keywords:
        first_keywords = " ".join(significant_keywords[:2])
        for db_name, info in TOURNAMENTS_DB.items():
            if db_name.lower().startswith(first_keywords):
                return info
    
    return None
