# 📚 Система управління адміністраторами через MongoDB

## Архітектура

### Як відбувається процес

```
1. Користувач залогінюється через Steam
   ↓
2. Backend отримує steam_id і викликає db.save_user()
   ↓
3. У MongoDB створюється документ:
   {
     "_id": ObjectId(...),
     "steam_id": "123456789",
     "is_admin": false,          ← За замовчуванням false
     "created_at": 2026-05-03T...
   }
   ↓
4. Адміністратор викликає API: /admin/users/{steam_id}/make-admin
   ↓
5. DB.set_admin() оновлює документ: is_admin = true
   ↓
6. Користувач залогінюється знову → адмін статус зчитується з бази
   ↓
7. JWT токен містить актуальний статус
```

## Файли реалізації

### 1. Модель користувача - `app/models/user.py`

```python
class UserResponse(BaseModel):
    steam_id: str
    is_admin: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
```

### 2. API маршрути - `app/api/admin.py`

```
GET  /admin/users              - Отримати всіх користувачів
GET  /admin/users/{steam_id}   - Отримати користувача
GET  /admin/admins             - Отримати всіх адмінів
POST /admin/users/{steam_id}/make-admin      - Дати адміну права
POST /admin/users/{steam_id}/revoke-admin    - Забрати адміну права
```

### 3. MongoDB методи - `app/database/mongodb.py`

```python
# Отримати користувача з бази
user = await db.get_user("123456789")
print(user["is_admin"])  # True або False

# Встановити адмін статус
await db.set_admin("123456789", True)   # Дати права
await db.set_admin("123456789", False)  # Забрати права

# Зберегти користувача (при Steam логіні)
await db.save_user("123456789")
```

### 4. Аутентифікація - `app/main.py`

JWT токен тепер містить `is_admin` з бази:

```python
access_token = AuthService.create_access_token(
    data={"sub": steam_id, "is_admin": is_admin}
)
```

## Приклади використання

### Приклад 1: Дати адміну права користувачу

```bash
# 1. Отримаємо токен тестового адміна
curl -X POST "http://127.0.0.1:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=1234" > token.json

TOKEN=$(jq -r '.access_token' token.json)

# 2. Даємо адміну права користувачу з steam_id=123456789
curl -X POST "http://127.0.0.1:8000/admin/users/123456789/make-admin" \
  -H "Authorization: Bearer $TOKEN"

# Відповідь:
# {
#   "message": "Користувач 123456789 тепер адмін",
#   "steam_id": "123456789",
#   "is_admin": true
# }
```

### Приклад 2: Переглянути всіх адмінів

```bash
curl -X GET "http://127.0.0.1:8000/admin/admins" \
  -H "Authorization: Bearer $TOKEN"

# Відповідь:
# [
#   {
#     "steam_id": "123456789",
#     "created_at": "2026-05-03T10:30:00.123456"
#   },
#   {
#     "steam_id": "987654321",
#     "created_at": "2026-05-03T11:00:00.654321"
#   }
# ]
```

### Приклад 3: Забрати адміну права

```bash
curl -X POST "http://127.0.0.1:8000/admin/users/123456789/revoke-admin" \
  -H "Authorization: Bearer $TOKEN"

# Відповідь:
# {
#   "message": "Адмін права видалені для 123456789",
#   "steam_id": "123456789",
#   "is_admin": false
# }
```

### Приклад 4: Перевірити права користувача

```bash
curl -X GET "http://127.0.0.1:8000/admin/users/123456789" \
  -H "Authorization: Bearer $TOKEN"

# Відповідь:
# {
#   "steam_id": "123456789",
#   "is_admin": true,
#   "created_at": "2026-05-03T10:30:00.123456"
# }
```

## Безпека

### Захист API

Усі endpoint'и під `/admin/` захищені функцією `is_admin()`:

```python
async def is_admin(token: str = Depends(oauth2_scheme)) -> str:
    """Перевірити, чи є користувач адміном"""
    current_user = AuthService.verify_token(token)
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=403,
            detail="Тільки адміністратор може це робити"
        )
    return current_user.get("sub")
```

### Перевірки

1. ✅ Токен мав бути дійсним (JWT валідація)
2. ✅ Токен мав містити `is_admin: true`
3. ✅ Користувач мав існувати в базі

## Можливе розширення

### Ролі (замість простого is_admin)

```python
# Моторалізація: is_admin: true/false → roles: ["admin", "moderator"]
class UserRole(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"

# У документі:
{
  "_id": ObjectId(...),
  "steam_id": "123456789",
  "roles": ["admin"],
  "created_at": 2026-05-03T...
}
```

### Логування змін адміна

```python
# Зберігати історію змін:
{
  "_id": ObjectId(...),
  "steam_id": "123456789",
  "changed_by": "admin_steam_id",
  "action": "make_admin",
  "timestamp": 2026-05-03T...
}
```

### Блокування користувачів

```python
# Додати поле is_banned
{
  "_id": ObjectId(...),
  "steam_id": "123456789",
  "is_admin": true,
  "is_banned": false,
  "created_at": 2026-05-03T...
}
```
