from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from app.services.opendota_client import OpenDotaClient
from app.services.auth_service import AuthService
from app.services.steam_auth import SteamAuthService
from app.services.stratz_client import StratzClient
from app.database.mongodb import db
from app.core.security import oauth2_scheme
from app.api.news import router as news_router
from app.api.admin import router as admin_router
from app.api.tournaments import router as tournaments_router
import httpx



app = FastAPI(title="Dota 2 Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# Додаємо маршрути для новин
app.include_router(news_router)

# Додаємо маршрути для адміністрування
app.include_router(admin_router)

# Додаємо маршрути для турнірів
app.include_router(tournaments_router)

# ПРИМІТКА: Якщо у вас є дійсний Stratz токен, розкомментуйте рядок нижче та замініть його
# STRATZ_TOKEN = "ВАШ_ДІЙСНИЙ_ТОКЕН_ТУТTRIM"

# Якщо токен недійсний, використовуємо dummy значення (система використовуватиме OpenDota як fallback)
STRATZ_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJTdWJqZWN0IjoiYmFhZjljZjAtOTMzYS00NzQyLWEzMmItYTc5MmQzMTI1OTU0IiwiU3RlYW1JZCI6IjExNTQ1NjAxMjYiLCJBUElVc2VyIjoidHJ1ZSIsIm5iZiI6MTc3NzgwNjAxNCwiZXhwIjoxODA5MzQyMDE0LCJpYXQiOjE3Nzc4MDYwMTQsImlzcyI6Imh0dHBzOi8vYXBpLnN0cmF0ei5jb20ifQ.PvVwr49phhpZLSWjDqiUcNRhlpkULxuwhxeH_X1sQGU"

dota_client = StratzClient(api_key=STRATZ_TOKEN)

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Отримання JWT токена.
    
    Підтримуються два способи:
    1. Тимчасово для тестування: username=admin, password=1234
    2. По steam_id (основний спосіб): username=steam_id, password=steam_id
    """
    username = form_data.username
    password = form_data.password
    
    # Для тестування - залишаємо hardcoded admin
    if username == "admin" and password == "1234":
        access_token = AuthService.create_access_token(
            data={"sub": username, "is_admin": True}
        )
        return {"access_token": access_token, "token_type": "bearer", "is_admin": True}
    
    # Основний спосіб - через steam_id
    # Передбачається, що користувач уже існує в базі (був залогінений через Steam)
    user = await db.get_user(username)
    if user and password == username:  # Тимчасово перевіряємо, що password = steam_id
        is_admin = user.get("is_admin", False)
        access_token = AuthService.create_access_token(
            data={"sub": username, "is_admin": is_admin}
        )
        return {"access_token": access_token, "token_type": "bearer", "is_admin": is_admin}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Невірний логін або пароль",
        headers={"WWW-Authenticate": "Bearer"},
    )

# --- STEAM AUTH ROUTES ---

@app.get("/auth/steam/login")
async def steam_login(request: Request):
    """Ендпоінт, який перенаправляє користувача на Steam"""
    # request.base_url автоматично дізнається твій хост (http://127.0.0.1:8000)
    host = str(request.base_url).rstrip("/")
    redirect_url = SteamAuthService.get_redirect_url(host)
    return RedirectResponse(url=redirect_url)

@app.get("/auth/steam/callback")
async def steam_callback(request: Request):
    query_params = dict(request.query_params)
    steam_id = await SteamAuthService.verify_login(query_params)
    
    if steam_id:
        await db.save_user(steam_id)
        
        # Завантажуємо дані користувача щоб дізнатись, чи адмін
        user_data = await db.get_user(steam_id)
        is_admin = user_data.get("is_admin", False) if user_data else False
        
        # Передаємо в токен інформацію про адмін статус
        access_token = AuthService.create_access_token(
            data={"sub": steam_id, "is_admin": is_admin}
        )
        
        # Перенаправляємо на фронтенд на спеціальну сторінку обробки входу
        return RedirectResponse(url=f"http://localhost:5173/login-success?token={access_token}")
        
    raise HTTPException(status_code=400, detail="Steam Login Failed")

# --- ЗАХИЩЕНИЙ ЕНДПОІНТ ---
@app.get("/users/me")
async def read_users_me(token: str = Depends(oauth2_scheme)):
    """Цей ендпоінт вимагає дійсного токена (замочок має бути закритий)"""
    payload = AuthService.verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недійсний токен або термін дії минув",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"user": payload.get("sub"), "message": "Ти успішно пройшов авторизацію!"}

@app.get("/health")
async def health_check():
    """Перевірка, чи запущений сервер"""
    return {"status": "ok", "message": "Backend is running"}

@app.post("/admin/set-admin/{steam_id}")
async def set_admin_status(steam_id: str, is_admin: bool, token: str = Depends(oauth2_scheme)):
    """Встановити адмін статус для користувача (тільки для адміністраторів)"""
    # Перевіряємо, що користувач, який робить запит, є адміном
    current_user = AuthService.verify_token(token)
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки адміністратор может це робити"
        )
    
    # Встановлюємо адмін статус
    await db.set_admin(steam_id, is_admin)
    
    status_text = "Адмін" if is_admin else "Користувач"
    return {
        "message": f"Статус оновлено",
        "steam_id": steam_id,
        "is_admin": is_admin,
        "status": status_text
    }

@app.get("/admin/users")
async def get_all_admins(token: str = Depends(oauth2_scheme)):
    """Отримати список всіх адміністраторів"""
    current_user = AuthService.verify_token(token)
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки адміністратор может це робити"
        )
    
    if db.db is not None:
        admins = await db.db["users"].find({"is_admin": True}).to_list(None)
        return {
            "admins": [
                {
                    "steam_id": admin.get("steam_id"),
                    "is_admin": admin.get("is_admin"),
                    "created_at": admin.get("created_at")
                }
                for admin in admins
            ],
            "total": len(admins)
        }
    
    return {"admins": [], "total": 0}

@app.on_event("startup")
async def startup_event():
    await db.connect_db()

@app.on_event("shutdown")
async def shutdown_event():
    await db.close_db()



@app.get("/")
async def root():
    return {"message": "Dota 2 Analytics System is online"}

@app.get("/matches/{match_id}")
async def get_match_info(match_id: int):
    print(f"[API] Запит на матч {match_id}")
    
    match_data = await dota_client.fetch_match_details(match_id)
    if match_data:
        print("[API] Успіх! Віддаємо дані зі Stratz.")
        return match_data
    
    print("[API] Stratz не знайдено. Вмикаємо генератор на базі OpenDota.")

    fallback_data = await dota_client.fetch_match_detail(match_id)
    if fallback_data:
        print("[API] Віддаємо синтезовані дані OpenDota.")
        return fallback_data
        
    raise HTTPException(status_code=404, detail="Матч не знайдено на жодному сервері")



@app.get("/users/me/info")
async def get_my_info(token: str = Depends(oauth2_scheme)):
    payload = AuthService.verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Неавторизовано")
    
    steam_id = payload.get("sub")
    print(f"[DEBUG] Запит інформації користувача. Steam ID: {steam_id}")
    
    player_data = await dota_client.fetch_player_profile(steam_id)
    print(f"[DEBUG] Дані від OpenDota: {player_data}")
    
    if not player_data:
        raise HTTPException(status_code=404, detail="Дані гравця не знайдено")
        
    return {
        "nickname": player_data.get("profile", {}).get("personaname", "Dota Player"),
        "avatar": player_data.get("profile", {}).get("avatarfull"),
        "rank_tier": player_data.get("rank_tier"),
        "leaderboard_rank": player_data.get("leaderboard_rank")
    }

@app.get("/heroes")
async def get_heroes():
    # Використовуємо наш сервіс
    data = await dota_client.fetch_hero_stats()
    return data

@app.get("/items")
async def get_items():
    # Отримуємо всі предмети з OpenDota
    items_data = await dota_client.fetch_all_items()
    
    # Переіндексуємо за числовим ID для фронтенду
    indexed_items = {}
    if isinstance(items_data, dict):
        for key, item in items_data.items():
            if isinstance(item, dict) and 'id' in item:
                item_id = item['id']
                indexed_items[item_id] = item
    
    return indexed_items
    
@app.get("/users/me/matches")
async def get_my_matches(token: str = Depends(oauth2_scheme)):
    """Повертає реальні матчі поточного залогіненого користувача"""
    payload = AuthService.verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Неавторизовано")
    
    steam_id = payload.get("sub")
    print(f"[BACKEND] Запит матчів користувача. Steam ID: {steam_id}")
    
    matches = await dota_client.fetch_user_matches(steam_id)
    print(f"[BACKEND] Повернено {len(matches) if matches else 0} матчів")
    
    if matches:
        print(f"[BACKEND] Перші 3 матчі:")
        for i, m in enumerate(matches[:3]):
            print(f"  [{i}] game_mode={m.get('game_mode')}, player_slot={m.get('player_slot')}, radiant_win={m.get('radiant_win')}")
    
    return matches

@app.get("/players/{steam_id}")
async def search_public_player(steam_id: str):
    """Шукає будь-якого гравця за його Steam ID"""
    try:
        # Якщо ввели короткий ID (32-бітний), конвертуємо в 64-бітний
        if len(steam_id) < 17:
            steam_id_64 = str(int(steam_id) + 76561197960265728)
        else:
            steam_id_64 = steam_id
            
        profile = await dota_client.fetch_player_profile(steam_id_64)
        matches = await dota_client.fetch_user_matches(steam_id_64)
        
        return {
            "profile": profile,
            "matches": matches if matches else [] # Віддаємо ВСІ матчі для точної статистики
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Невірний формат Steam ID")

@app.get("/users/me/debug")
async def debug_user_info(token: str = Depends(oauth2_scheme)):
    """ДЕБАГ: Показує інформацію про користувача та його Steam ID"""
    payload = AuthService.verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Неавторизовано")
    
    steam_id_64 = payload.get("sub")
    steam_id_32 = int(steam_id_64) - 76561197960265728
    
    player_data = await dota_client.fetch_player_profile(steam_id_64)
    matches = await dota_client.fetch_user_matches(steam_id_64)
    
    return {
        "steam_id_64": steam_id_64,
        "steam_id_32": steam_id_32,
        "has_profile": bool(player_data),
        "profile_name": player_data.get("profile", {}).get("personaname") if player_data else None,
        "rank_tier": player_data.get("rank_tier") if player_data else None,
        "matches_count": len(matches) if matches else 0,
        "first_match": matches[0]["match_id"] if matches else None
    }

@app.get("/items")
async def get_items():
    """Повертає всі предмети"""
    data = await dota_client.fetch_all_items()
    return data

@app.get("/analytics/top-heroes")
async def get_meta():
    # 1. Отримуємо аналітику від сервісу
    top_heroes = await dota_client.get_top_meta_heroes()
    
    # 2. (Опціонально) Зберігаємо в MongoDB для історії
    # Тут ми реалізуємо асинхронний запис
    for hero in top_heroes:
        await db.save_hero(hero)
        
    return top_heroes