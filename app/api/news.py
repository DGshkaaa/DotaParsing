from fastapi import APIRouter, Depends, HTTPException, status
from app.models.news import NewsCreate, NewsUpdate, NewsResponse
from app.services.news_service import NewsService
from app.services.auth_service import AuthService
from app.core.security import oauth2_scheme

router = APIRouter(prefix="/news", tags=["news"])


async def is_admin(token: str = Depends(oauth2_scheme)) -> str:
    """Перевірити, чи є користувач адміном"""
    current_user = AuthService.verify_token(token)
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки адміністратор може це робити"
        )
    return current_user.get("sub")


# Публічні маршрути (для всіх)
@router.get("/")
async def get_all_news(limit: int = 10, skip: int = 0):
    """Отримати всі новини"""
    return await NewsService.get_all_news(limit, skip)


@router.get("/{news_id}")
async def get_news(news_id: str):
    """Отримати одну новину"""
    news = await NewsService.get_news_by_id(news_id)
    if not news:
        raise HTTPException(status_code=404, detail="Новина не знайдена")
    return news


# Адмін маршрути (тільки для адміністратора)
@router.post("/", status_code=201)
async def create_news(news: NewsCreate, admin: str = Depends(is_admin)):
    """Створити нову новину"""
    return await NewsService.create_news(news.title, news.content, news.image_url)


@router.put("/{news_id}")
async def update_news(news_id: str, news: NewsUpdate, admin: str = Depends(is_admin)):
    """Оновити новину"""
    updated = await NewsService.update_news(
        news_id, 
        news.title, 
        news.content, 
        news.image_url
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Новина не знайдена")
    return updated


@router.delete("/{news_id}")
async def delete_news(news_id: str, admin: str = Depends(is_admin)):
    """Видалити новину"""
    success = await NewsService.delete_news(news_id)
    if not success:
        raise HTTPException(status_code=404, detail="Новина не знайдена")
    return {"message": "Новина видалена"}
