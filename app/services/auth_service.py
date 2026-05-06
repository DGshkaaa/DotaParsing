import jwt
from datetime import datetime, timedelta, timezone

class AuthService:
    """Сервіс для генерації та валідації JWT токенів"""
    
    SECRET_KEY = "super_secret_dota_key_for_coursework"
    ALGORITHM = "HS256"

    @classmethod
    def create_access_token(cls, data: dict, expires_delta: timedelta = timedelta(hours=2)):
        """Створює зашифрований токен з даними користувача"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + expires_delta
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, cls.SECRET_KEY, algorithm=cls.ALGORITHM)
        return encoded_jwt

    @classmethod
    def verify_token(cls, token: str):
        """Розшифровує токен і повертає дані (або None, якщо токен невалідний)"""
        try:
            payload = jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            print("❌ Токен протермінований")
            return None
        except jwt.InvalidTokenError:
            print("❌ Невалідний токен")
            return None