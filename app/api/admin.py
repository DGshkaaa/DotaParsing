from fastapi import APIRouter, Depends, HTTPException, status
from app.services.auth_service import AuthService
from app.core.security import oauth2_scheme
from app.database.mongodb import db
from app.models.user import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


async def is_admin(token: str = Depends(oauth2_scheme)) -> str:
    """Перевірити, чи є користувач адміном"""
    current_user = AuthService.verify_token(token)
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки адміністратор може це робити"
        )
    return current_user.get("sub")


@router.get("/users")
async def list_all_users(admin: str = Depends(is_admin)):
    """Отримати список всіх користувачів (тільки для адміна)"""
    if db.db is not None:
        users = []
        async for user in db.db["users"].find():
            users.append({
                "steam_id": user.get("steam_id"),
                "is_admin": user.get("is_admin", False),
                "created_at": user.get("created_at")
            })
        return users
    return []


@router.get("/users/{steam_id}")
async def get_user_info(steam_id: str, admin: str = Depends(is_admin)):
    """Отримати інформацію про користувача"""
    user = await db.get_user(steam_id)
    if not user:
        raise HTTPException(status_code=404, detail="Користувач не знайдений")
    
    return {
        "steam_id": user.get("steam_id"),
        "is_admin": user.get("is_admin", False),
        "created_at": user.get("created_at")
    }


@router.post("/users/{steam_id}/make-admin")
async def make_admin(steam_id: str, admin: str = Depends(is_admin)):
    """Зробити користувача адміном"""
    user = await db.get_user(steam_id)
    if not user:
        raise HTTPException(status_code=404, detail="Користувач не знайдений")
    
    await db.set_admin(steam_id, True)
    return {
        "message": f"Користувач {steam_id} тепер адмін",
        "steam_id": steam_id,
        "is_admin": True
    }


@router.post("/users/{steam_id}/revoke-admin")
async def revoke_admin(steam_id: str, admin: str = Depends(is_admin)):
    """Забрати адмін права у користувача"""
    user = await db.get_user(steam_id)
    if not user:
        raise HTTPException(status_code=404, detail="Користувач не знайдений")
    
    await db.set_admin(steam_id, False)
    return {
        "message": f"Адмін права видалені для {steam_id}",
        "steam_id": steam_id,
        "is_admin": False
    }


@router.get("/admins")
async def get_all_admins(admin: str = Depends(is_admin)):
    """Отримати список всіх адмінів"""
    if db.db is not None:
        admins = []
        async for user in db.db["users"].find({"is_admin": True}):
            admins.append({
                "steam_id": user.get("steam_id"),
                "created_at": user.get("created_at")
            })
        return admins
    return []
