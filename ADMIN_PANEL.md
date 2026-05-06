# 📰 Адміністративна Панель - Управління Новинами

## 📋 Огляд

Адміністративна панель дозволяє адміністратору управляти новинами в додатку:
- ➕ **Додавати** нові новини
- ✏️ **Редагувати** існуючі новини
- 🗑️ **Видаляти** новини

## 🔐 Автентифікація

### Доступ до адмін панелі

1. **Запуск бекенду**:
```bash
cd app
python -m uvicorn main:app --reload --port 8000
```

2. **Для тестування** використовуйте облікові дані:
   - **Логін**: `admin`
   - **Пароль**: `1234`

3. **Отримання токена**:
```bash
curl -X POST "http://127.0.0.1:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=1234"
```

4. **Запуск фронтенду**:
```bash
cd frontend
npm install  # якщо ще не встановлено
npm run dev
```

5. **Доступ до панелі**: 
   - Перейдіть за посиланням в браузері на `http://localhost:5173`
   - Натисніть кнопку "⚙️ Адмін" (видима тільки якщо залогінені як адмін)

## 🔐 Управління Адмін Статусом (MongoDB)

Адмін статус тепер зберігається в MongoDB і може управлятись через API!

### API Endpoints для управління адмінами

1. **Надати адміну права**:
```bash
curl -X POST "http://127.0.0.1:8000/admin/users/{steam_id}/make-admin" \
  -H "Authorization: Bearer {your_admin_token}"
```

2. **Список всіх адмінів**:
```bash
curl -X GET "http://127.0.0.1:8000/admin/admins" \
  -H "Authorization: Bearer {your_admin_token}"
```

3. **Список всіх користувачів**:
```bash
curl -X GET "http://127.0.0.1:8000/admin/users" \
  -H "Authorization: Bearer {your_admin_token}"
```

4. **Забрати адміну права**:
```bash
curl -X POST "http://127.0.0.1:8000/admin/users/{steam_id}/revoke-admin" \
  -H "Authorization: Bearer {your_admin_token}"
```

### Як працює система

1. Користувач залогінюється через Steam → створюється запис в MongoDB з `is_admin: false`
2. Адмін викликає `/admin/users/{steam_id}/make-admin` → `is_admin` змінюється на `true`
3. При наступному входу користувача, його адмін статус зчитується з бази
4. JWT токен містить актуальний адмін статус з моменту входу

## 🏗️ Архітектура

### Backend (`app/`)

#### API Маршрути (`app/api/news.py`)
```python
# Публічні маршрути
GET /news/                    # Отримати всі новини (список)
GET /news/{news_id}           # Отримати одну новину

# Захищені маршрути (тільки адмін)
POST /news/                   # Створити нову новину
PUT /news/{news_id}           # Оновити новину
DELETE /news/{news_id}        # Видалити новину
```

#### Модель Новини (`app/models/news.py`)
```python
class NewsCreate(BaseModel):
    title: str              # до 200 символів
    content: str            # до 5000 символів
    image_url: Optional[str] # URL зображення (опціонально)

class NewsUpdate(BaseModel):
    title: Optional[str]
    content: Optional[str]
    image_url: Optional[str]

class NewsResponse(BaseModel):
    id: str                 # MongoDB _id
    title: str
    content: str
    image_url: Optional[str]
    created_at: datetime
    updated_at: datetime
```

#### Сервіс Новин (`app/services/news_service.py`)
Класс `NewsService` з методами:
- `create_news()` - Створення нової новини
- `get_all_news()` - Отримання всіх новин (сортування за датою)
- `get_news_by_id()` - Отримання однієї новини
- `update_news()` - Оновлення новини
- `delete_news()` - Видалення новини

#### Аутентифікація (`app/services/auth_service.py`)
- JWT токени з терміном дії 2 години
- Перевірка токена в `is_admin()` dependency

### Frontend (`frontend/`)

#### Адмін Панель (`src/pages/AdminPanel.jsx`)

**Функціональність**:
1. ✅ Перевірка, чи користувач є адміном
2. 📝 Форма для додавання/редагування новин
3. 📊 Список всіх новин з кнопками редагування та видалення
4. 💬 Повідомлення про успіх/помилку

**State**:
```javascript
- news: []              // Список новин
- loading: boolean      // Завантаження
- submitting: boolean   // Відправлення форми
- editingId: string     // ID редагованої новини
- token: string         // JWT токен
- isAdmin: boolean      // Перевірка ролі
- message: {type, text} // Повідомлення
- formData: {           // Форма нової/редагованої новини
    title: string
    content: string
    image_url: string
  }
```

#### Стилі (`src/styles/AdminPanel.css`)

- 🎨 Темний інтерфейс з червоним акцентом (Dota 2 style)
- 📱 Адаптивна сітка (1 колона на мобільних)
- ✨ Анімації та переходи
- 🔔 Повідомлення про операції

## 🔄 Робочий Процес

### Додавання Новини
1. Заповніть форму (заголовок, вміст, URL зображення)
2. Натисніть кнопку "Додати"
3. Отримаєте повідомлення про успіх
4. Новина з'явиться у списку

### Редагування Новини
1. Натисніть кнопку "✏️ Редагувати" на новині
2. Форма заповниться даними новини
3. Внесіть необхідні зміни
4. Натисніть "Зберегти"
5. Отримаєте повідомлення про успіх

### Видалення Новини
1. Натисніть кнопку "🗑️ Видалити"
2. Підтвердіть дію в діалоговому вікні
3. Новина видалиться зі списку

## 🗄️ База Даних (MongoDB)

### Колекція: `news`

```javascript
{
  _id: ObjectId,
  title: string,
  content: string,
  image_url: string (nullable),
  created_at: DateTime,
  updated_at: DateTime
}
```

**Приклад документу**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Новий патч Dota 2",
  "content": "Опис змін у патчі...",
  "image_url": "https://example.com/image.jpg",
  "created_at": "2024-05-03T10:00:00Z",
  "updated_at": "2024-05-03T11:00:00Z"
}
```

## 📦 API Приклади

### Отримання всіх новин
```bash
curl -X GET "http://127.0.0.1:8000/news/"
```

### Створення новини
```bash
curl -X POST "http://127.0.0.1:8000/news/" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Нова новина",
    "content": "Вміст новини",
    "image_url": "https://example.com/image.jpg"
  }'
```

### Оновлення новини
```bash
curl -X PUT "http://127.0.0.1:8000/news/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Оновлена новина",
    "content": "Новий вміст"
  }'
```

### Видалення новини
```bash
curl -X DELETE "http://127.0.0.1:8000/news/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## ⚡ Покращення та Розширення

### Можливі вдосконалення:
1. 👥 Система ролей користувачів (editor, moderator, admin)
2. 🔍 Пошук та фільтрація новин
3. 📄 Пагінація у списку
4. 🖼️ Завантаження файлів на сервер
5. 📅 Планування публікації новин
6. 👁️ Перегляд опублікованої новини
7. 📊 Логування дій адміністратора
8. 🔔 Сповіщення про нові новини

## 🐛 Виконання помилок

### Помилка: "Доступ заборонений"
- ✅ Переконайтесь, що користувач залогінений як `admin`
- ✅ Перевірте токен не протермінований

### Помилка: "Новина не знайдена"
- ✅ Перевірте ID новини
- ✅ Переконайтесь, що новина існує в базі даних

### Помилка: "Невалідний токен"
- ✅ Отримайте новий токен через `/token` ендпоінт
- ✅ Переконайтесь, що токен передається з префіксом `Bearer`

---

**Дата останнього оновлення**: 3 травня 2026 р.
