import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        uri = os.getenv("MONGODB_URL")
        if not uri:
            print("⚠️ MONGODB_URL не встановлено в .env")
            return
            
        print(f"🔄 Спроба підключення до бази...") 
        try:
            cls.client = AsyncIOMotorClient(
                uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000
            )
            # Перевіряємо з'єднання
            await cls.client.admin.command('ping')
            # Тут ми кажемо, що наша база буде називатися dota_analytics
            cls.db = cls.client["dota_analytics"] 
            print("✅ Connected to MongoDB Atlas")
        except Exception as e:
            print(f"❌ Помилка підключення до MongoDB: {e}")
            cls.client = None
            cls.db = None

    @classmethod
    async def close_db(cls):
        if cls.client:
            try:
                cls.client.close()
                print("❌ MongoDB Atlas connection closed")
            except Exception as e:
                print(f"⚠️ Помилка при закритті з'єднання: {e}")

    @classmethod
    async def save_hero(cls, hero_data: dict):
        if cls.db is not None:
            hero_name = hero_data.get("name", "Unknown Hero")
            print(f"💾 Записуємо в базу: {hero_name}")
            
            await cls.db["heroes"].update_one(
                {"id": hero_data["id"]}, 
                {"$set": hero_data}, 
                upsert=True
            )
        else:
            print("⚠️ ПОМИЛКА: База не ініціалізована (cls.db is None)")

    @classmethod
    async def save_user(cls, steam_id: str):
        """Збереження або оновлення профілю користувача"""
        if cls.db is not None:
            print(f"👤 Зберігаємо користувача: {steam_id}")
            await cls.db["users"].update_one(
                {"steam_id": steam_id}, 
                {
                    "$set": {"steam_id": steam_id, "updated_at": datetime.utcnow()},
                    # $setOnInsert задає значення тільки при першому створенні
                    "$setOnInsert": {
                        "created_at": datetime.utcnow(),
                        "is_admin": False  # За замовчуванням не адмін
                    } 
                }, 
                upsert=True
            )
        else:
            print("⚠️ ПОМИЛКА: База не ініціалізована")

    @classmethod
    async def get_user(cls, steam_id: str):
        """Отримати дані користувача"""
        if cls.db is not None:
            user = await cls.db["users"].find_one({"steam_id": steam_id})
            return user
        return None

    @classmethod
    async def set_admin(cls, steam_id: str, is_admin: bool):
        """Встановити/видалити адмін статус для користувача"""
        if cls.db is not None:
            print(f"🔐 Встановлюємо is_admin={is_admin} для: {steam_id}")
            await cls.db["users"].update_one(
                {"steam_id": steam_id},
                {"$set": {"is_admin": is_admin}}
            )
        else:
            print("⚠️ ПОМИЛКА: База не ініціалізована")

db = Database()