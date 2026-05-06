from curl_cffi.requests import AsyncSession
import asyncio
import struct

class StratzClient:
    BASE_URL = "https://api.stratz.com/graphql"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    @staticmethod
    def decode_timeline_data(encoded_str):
        """
        Декодує таймлайн дані від Stratz.
        Stratz повертає дані як рядок hex-символів, де кожні 4 символи = 2 байти = число
        """
        if not encoded_str or not isinstance(encoded_str, str):
            return []
        
        try:
            # Розбиваємо на пари 4-символьних блоків (2 байти кожен)
            result = []
            for i in range(0, len(encoded_str), 4):
                chunk = encoded_str[i:i+4]
                if len(chunk) == 4:
                    # Конвертуємо hex-рядок в число (little-endian 16-bit)
                    num = int(chunk, 16)
                    result.append(num)
            return result
        except:
            return []

    @staticmethod
    def decode_items_timeline(encoded_str):
        """
        Декодує таймлайн предметів від Stratz.
        Повертає масив з масивами ID предметів для кожної хвилини.
        """
        if not encoded_str or not isinstance(encoded_str, str):
            return []
        
        try:
            result = []
            # Кожні 12 символів = 6 предметів (по 2 символи на предмет)
            for i in range(0, len(encoded_str), 12):
                chunk = encoded_str[i:i+12]
                items = []
                for j in range(0, len(chunk), 2):
                    item_id = int(chunk[j:j+2], 16)
                    if item_id > 0:
                        items.append(item_id)
                result.append(items)
            return result
        except:
            return []

    async def fetch_hero_stats(self):
        async with AsyncSession(verify=False, timeout=20.0) as client:
            response = await client.get("https://api.opendota.com/api/heroStats")
            if response.status_code == 200:
                return response.json()
            return []

    async def fetch_all_items(self):
        async with AsyncSession(verify=False, timeout=20.0) as client:
            response = await client.get("https://api.opendota.com/api/constants/items")
            if response.status_code == 200:
                return response.json()
            return {}

    async def fetch_player_profile(self, steam_id_64: str):
        # РОЗУМНА КОНВЕРТАЦІЯ ID
        try:
            val = int(steam_id_64)
            steam_id_32 = val - 76561197960265728 if val >= 76561197960265728 else val
        except ValueError:
            steam_id_32 = 0

        if steam_id_32 == 0:
            return {"profile": {"personaname": "Некоректний ID", "avatarfull": "https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png"}, "rank_tier": None}

        query = """
        query($steamId: Long!) {
          player(steamAccountId: $steamId) {
            steamAccount {
              name
              avatar
              seasonRank
            }
          }
        }
        """
        
        async with AsyncSession(verify=False, timeout=30.0) as client:
            for attempt in range(3):
                try:
                    response = await client.post(
                        self.BASE_URL,
                        json={"query": query, "variables": {"steamId": steam_id_32}},
                        headers=self.headers
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        player_data = data.get("data", {}).get("player")
                        
                        if not player_data:
                            return {"profile": {"personaname": "Прихований профіль", "avatarfull": "https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png"}, "rank_tier": None}
                        
                        steam_account = player_data.get("steamAccount", {})
                        return {
                            "profile": {
                                "personaname": steam_account.get("name") or "Dota Player",
                                "avatarfull": steam_account.get("avatar") or "https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png"
                            },
                            "rank_tier": steam_account.get("seasonRank")
                        }
                    elif response.status_code == 429:
                        print(f"[Stratz Profile] Ліміт запитів! Чекаємо 2 сек (спроба {attempt+1}/3)")
                        await asyncio.sleep(2.0)
                        continue
                    else:
                        break
                except Exception as e:
                    print(f"[Stratz Profile Exception] {e}")
                    await asyncio.sleep(1.0)
                    
        return {"profile": {"personaname": "Помилка сервера", "avatarfull": "https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png"}, "rank_tier": None}


    async def fetch_user_matches(self, steam_id_64: str):
        # РОЗУМНА КОНВЕРТАЦІЯ ID
        try:
            val = int(steam_id_64)
            steam_id_32 = val - 76561197960265728 if val >= 76561197960265728 else val
        except ValueError:
            return []

        if steam_id_32 == 0:
            return []

        print(f"[Stratz] Завантаження матчів для SteamID32={steam_id_32}")
        
        # 1. ЗАПИТ НА КІЛЬКІСТЬ МАТЧІВ
        count_query = """
        query($steamId: Long!) {
          player(steamAccountId: $steamId) {
            matchCount
          }
        }
        """

        # 2. ЗАПИТ НА САМІ МАТЧІ
        matches_query = """
        query($steamId: Long!, $skip: Int!) {
          player(steamAccountId: $steamId) {
            matches(request: { take: 100, skip: $skip }) {
              id
              gameMode
              lobbyType
              didRadiantWin
              durationSeconds
              startDateTime
              players(steamAccountId: $steamId) {
                heroId
                isRadiant
                kills
                deaths
                assists
              }
            }
          }
        }
        """
        
        all_matches = []
        sem = asyncio.Semaphore(4)

        async with AsyncSession(verify=False, timeout=60.0) as client:
            # Дізнаємось реальну кількість матчів гравця
            try:
                count_res = await client.post(
                    self.BASE_URL,
                    json={"query": count_query, "variables": {"steamId": steam_id_32}},
                    headers=self.headers
                )
                if count_res.status_code == 200:
                    data = count_res.json()
                    total_matches = data.get("data", {}).get("player", {}).get("matchCount") or 0
                else:
                    total_matches = 4000 # Якщо щось пішло не так, ставимо дефолт
            except Exception:
                total_matches = 4000
                
            if total_matches == 0:
                return []

            # РОЗУМНИЙ ЛІМІТ: Беремо скільки є, але НЕ БІЛЬШЕ 4000
            fetch_limit = min(total_matches, 4000)
            print(f"[Stratz] Буде завантажено {fetch_limit} останніх матчів (з {total_matches} загалом)")

            async def fetch_chunk(skip):
                async with sem:
                    await asyncio.sleep(0.3)
                    return await client.post(
                        self.BASE_URL,
                        json={"query": matches_query, "variables": {"steamId": steam_id_32, "skip": skip}},
                        headers=self.headers
                    )

            tasks = []
            for skip in range(0, fetch_limit, 100):
                tasks.append(fetch_chunk(skip))
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            for response in responses:
                if isinstance(response, Exception) or response.status_code != 200:
                    continue
                    
                data = response.json()
                matches_data = data.get("data", {}).get("player", {}).get("matches")
                
                if not matches_data:
                    continue
                    
                for m in matches_data:
                    players_list = m.get("players", [])
                    if not players_list:
                        continue
                        
                    player_info = players_list[0]
                    is_radiant = player_info.get("isRadiant")
                    
                    mapped_match = {
                        "match_id": m.get("id"),
                        "game_mode": m.get("gameMode"),
                        "lobby_type": m.get("lobbyType"),
                        "duration": m.get("durationSeconds"),
                        "start_time": m.get("startDateTime"),
                        "radiant_win": m.get("didRadiantWin"),
                        "hero_id": player_info.get("heroId"),
                        "kills": player_info.get("kills"),
                        "deaths": player_info.get("deaths"),
                        "assists": player_info.get("assists"),
                        "player_slot": 0 if is_radiant else 128
                    }
                    all_matches.append(mapped_match)
                    
        print(f"[Stratz] Отримано {len(all_matches)} матчів")
        all_matches.sort(key=lambda x: x["match_id"], reverse=True)
        return all_matches

    async def get_top_meta_heroes(self):
        heroes = await self.fetch_hero_stats()
        sorted_heroes = sorted(
            heroes, 
            key=lambda x: (x.get('pro_win', 0) / x.get('pro_pick', 1)) if x.get('pro_pick', 0) > 0 else 0, 
            reverse=True
        )
        return sorted_heroes[:10]

    async def fetch_match_detail(self, match_id: int):
            """
            Запасний генератор через OpenDota.
            Рівномірно розподіляє предмети по таймлайну.
            """
            try:
                async with AsyncSession(verify=False, timeout=30.0) as client:
                    response = await client.get(
                        f"https://api.opendota.com/api/matches/{match_id}",
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        match_data = response.json()
                        players_data = match_data.get("players", [])
                        duration_minutes = int(match_data.get("duration", 0) / 60) + 1
                        
                        processed_players = []
                        for player in players_data:
                            gpm = player.get("gold_per_min", 0) or 0
                            total_gold = player.get("net_worth", 0) or player.get("total_gold", 0) or 0
                            
                            gold_t = []
                            for minute in range(duration_minutes):
                                gold = int((gpm * minute) if minute < duration_minutes - 1 else total_gold)
                                gold_t.append(gold)
                            
                            kills = player.get("kills", 0)
                            deaths = player.get("deaths", 0)
                            assists = player.get("assists", 0)
                            
                            kills_per_minute = kills / max(duration_minutes, 1)
                            deaths_per_minute = deaths / max(duration_minutes, 1)
                            assists_per_minute = assists / max(duration_minutes, 1)
                            
                            kills_t, deaths_t, assists_t = [], [], []
                            for minute in range(duration_minutes):
                                kills_t.append(min(kills, int(kills_per_minute * minute)))
                                deaths_t.append(min(deaths, int(deaths_per_minute * minute)))
                                assists_t.append(min(assists, int(assists_per_minute * minute)))
                            
                            final_items = [
                                player.get("item_0"), player.get("item_1"), player.get("item_2"),
                                player.get("item_3"), player.get("item_4"), player.get("item_5")
                            ]
                            
                            # РОЗУМНИЙ РОЗПОДІЛ ПРЕДМЕТІВ ПО ТАЙМЕРУ
                            purchase_time = {}
                            valid_items = [i for i in final_items if i is not None and i > 0]
                            if valid_items:
                                step = max(1, duration_minutes // (len(valid_items) + 1))
                                minute_counter = step
                                for i_id in valid_items:
                                    purchase_time[i_id] = min(minute_counter, duration_minutes - 1)
                                    minute_counter += step
                            
                            processed_players.append({
                                "playerSlot": player.get("player_slot", 0),
                                "heroId": player.get("hero_id"),
                                "is_radiant": player.get("isRadiant", player.get("player_slot", 0) < 128),
                                "kills": kills, "deaths": deaths, "assists": assists,
                                "goldT": gold_t, "killsT": kills_t, "deathsT": deaths_t, "assistsT": assists_t,
                                "final_items": final_items,
                                "purchase_time": purchase_time
                            })
                        
                        return {
                            "id": match_data.get("match_id"),
                            "duration": match_data.get("duration"),
                            "radiant_win": match_data.get("radiant_win"),
                            "radiant_score": sum(p.get("kills", 0) for p in players_data[:5]),
                            "dire_score": sum(p.get("kills", 0) for p in players_data[5:10]),
                            "lobby_type": match_data.get("lobby_type"),
                            "game_mode": match_data.get("game_mode"),
                            "players": processed_players
                        }
            except Exception as e:
                print(f"[OpenDota Fallback Exception] {e}")
            return None

    async def fetch_match_details(self, match_id: int):
            # ЗАПИТ ВИПРАВЛЕНО: networth з маленької літери "w"
            query = """
            query($matchId: Long!) {
            match(id: $matchId) {
                id
                durationSeconds
                didRadiantWin
                radiantKills
                direKills
                players {
                heroId
                isRadiant
                kills
                deaths
                assists
                item0Id
                item1Id
                item2Id
                item3Id
                item4Id
                item5Id
                playbackData {
                    playerUpdateGoldEvents { time networth }
                    purchaseEvents { itemId time }
                    killEvents { time }
                    deathEvents { time }
                    assistEvents { time }
                }
                }
            }
            }
            """
            try:
                async with AsyncSession(verify=False, timeout=30.0) as client:
                    response = await client.post(self.BASE_URL, json={"query": query, "variables": {"matchId": match_id}}, headers=self.headers)
                    
                    if response.status_code != 200:
                        print(f"[Stratz API Error] HTTP {response.status_code}. Response: {response.text}")
                        return None
                        
                    data = response.json()
                    if "errors" in data:
                        print(f"[Stratz GraphQL Error] {data['errors']}")
                        return None
                        
                    match_data = data.get("data", {}).get("match")
                    if not match_data:
                        return None
                    
                    dur_mins = match_data.get("durationSeconds", 0) // 60 + 2
                    players = []
                    
                    for p in match_data.get("players", []):
                        pb = p.get("playbackData") or {}
                        
                        # 1. ТАЙМЛАЙН ГОЛДИ (тепер читаємо правильне поле networth)
                        gold_t = [0] * dur_mins
                        for ev in pb.get("playerUpdateGoldEvents", []):
                            m = max(0, ev.get("time", 0) // 60)
                            if m < dur_mins: 
                                gold_t[m] = ev.get("networth", ev.get("gold", 0))
                        
                        last_g = 0
                        for i in range(dur_mins):
                            if gold_t[i] == 0: 
                                gold_t[i] = last_g
                            else: 
                                last_g = gold_t[i]
                                
                        # 2. ТАЙМЛАЙН KDA
                        kills_t = [0] * dur_mins
                        deaths_t = [0] * dur_mins
                        assists_t = [0] * dur_mins
                        
                        for ev in pb.get("killEvents", []):
                            m = max(0, ev.get("time", 0) // 60)
                            if m < dur_mins: kills_t[m] += 1
                        for ev in pb.get("deathEvents", []):
                            m = max(0, ev.get("time", 0) // 60)
                            if m < dur_mins: deaths_t[m] += 1
                        for ev in pb.get("assistEvents", []):
                            m = max(0, ev.get("time", 0) // 60)
                            if m < dur_mins: assists_t[m] += 1
                            
                        for i in range(1, dur_mins):
                            kills_t[i] += kills_t[i-1]
                            deaths_t[i] += deaths_t[i-1]
                            assists_t[i] += assists_t[i-1]
                            
                        # 3. ТОЧНИЙ ЧАС ПОКУПКИ ПРЕДМЕТІВ
                        purchase_time = {}
                        for pur in pb.get("purchaseEvents", []):
                            i_id = pur.get("itemId")
                            time_sec = pur.get("time", 0)
                            if i_id:
                                m = max(0, time_sec // 60)
                                if i_id not in purchase_time or m < purchase_time[i_id]:
                                    purchase_time[i_id] = m
                                    
                        final_items = [
                            p.get("item0Id"), p.get("item1Id"), p.get("item2Id"),
                            p.get("item3Id"), p.get("item4Id"), p.get("item5Id")
                        ]
                        
                        players.append({
                            "playerSlot": p.get("playerSlot", 0),
                            "heroId": p.get("heroId"),
                            "is_radiant": p.get("isRadiant"),
                            "kills": p.get("kills", 0),
                            "deaths": p.get("deaths", 0),
                            "assists": p.get("assists", 0),
                            "goldT": gold_t,
                            "killsT": kills_t,
                            "deathsT": deaths_t,
                            "assistsT": assists_t,
                            "final_items": final_items,
                            "purchase_time": purchase_time
                        })
                        
                    radiant_players = [p for p in players if p.get("is_radiant")]
                    dire_players = [p for p in players if not p.get("is_radiant")]
                    
                    return {
                        "id": match_data["id"],
                        "duration": match_data["durationSeconds"],
                        "radiant_win": match_data["didRadiantWin"],
                        "radiant_score": match_data.get("radiantKills", 0),
                        "dire_score": match_data.get("direKills", 0),
                        "players": radiant_players + dire_players
                    }
            except Exception as e:
                print(f"[Stratz Details Exception] {e}")
                return None