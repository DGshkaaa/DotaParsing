from bson import ObjectId
from datetime import datetime
from app.database.mongodb import db


class NewsService:
    @staticmethod
    async def create_news(title: str, content: str, image_url: str = None) -> dict:
        """Створити нову новину"""
        news_data = {
            "title": title,
            "content": content,
            "image_url": image_url,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.db["news"].insert_one(news_data)
        return {
            "id": str(result.inserted_id),
            "title": title,
            "content": content,
            "image_url": image_url,
            "created_at": news_data["created_at"].isoformat(),
            "updated_at": news_data["updated_at"].isoformat()
        }

    @staticmethod
    async def get_all_news(limit: int = 10, skip: int = 0) -> list:
        """Отримати всі новини (для фронтенду)"""
        news_list = await db.db["news"].find().skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
        return [
            {
                "id": str(news["_id"]),
                "title": news.get("title"),
                "content": news.get("content"),
                "image_url": news.get("image_url"),
                "created_at": news.get("created_at").isoformat() if news.get("created_at") else None,
                "updated_at": news.get("updated_at").isoformat() if news.get("updated_at") else None
            }
            for news in news_list
        ]

    @staticmethod
    async def get_news_by_id(news_id: str) -> dict:
        """Отримати новину за ID"""
        try:
            news = await db.db["news"].find_one({"_id": ObjectId(news_id)})
            if news:
                return {
                    "id": str(news["_id"]),
                    "title": news.get("title"),
                    "content": news.get("content"),
                    "image_url": news.get("image_url"),
                    "created_at": news.get("created_at").isoformat() if news.get("created_at") else None,
                    "updated_at": news.get("updated_at").isoformat() if news.get("updated_at") else None
                }
            return None
        except:
            return None

    @staticmethod
    async def update_news(news_id: str, title: str = None, content: str = None, image_url: str = None) -> dict:
        """Оновити новину"""
        try:
            update_data = {"updated_at": datetime.utcnow()}
            
            # Оновлюємо тільки передані поля
            if title is not None and title.strip():
                update_data["title"] = title
            if content is not None and content.strip():
                update_data["content"] = content
            if image_url is not None:
                update_data["image_url"] = image_url if image_url.strip() else None

            result = await db.db["news"].update_one(
                {"_id": ObjectId(news_id)},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                return await NewsService.get_news_by_id(news_id)
            return None
        except:
            return None

    @staticmethod
    async def delete_news(news_id: str) -> bool:
        """Видалити новину"""
        try:
            result = await db.db["news"].delete_one({"_id": ObjectId(news_id)})
            return result.deleted_count > 0
        except:
            return False
