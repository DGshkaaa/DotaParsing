import urllib.parse
import httpx

class SteamAuthService:
    """Сервіс для інтеграції зі Steam OpenID 2.0"""
    STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"

    @classmethod
    def get_redirect_url(cls, host: str) -> str:
        """Формує URL для перенаправлення на сторінку входу Steam"""
        params = {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "checkid_setup",
            "openid.return_to": f"{host}/auth/steam/callback",
            "openid.realm": host,
            "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
            "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        }
        # urllib.parse.urlencode робить зі словника рядок типу ?key=value&key2=value2
        return f"{cls.STEAM_OPENID_URL}?{urllib.parse.urlencode(params)}"

    @classmethod
    async def verify_login(cls, query_params: dict) -> str | None:
        """Перевіряє відповідь від Steam та витягує SteamID64"""
        # Steam вимагає замінити mode на check_authentication для перевірки
        query_params["openid.mode"] = "check_authentication"
        
        async with httpx.AsyncClient() as client:
            # Надсилаємо параметри назад у Steam для верифікації
            response = await client.post(cls.STEAM_OPENID_URL, data=query_params)
            
        # Якщо Steam підтвердив валідність
        if "is_valid:true" in response.text:
            # Витягуємо SteamID з посилання (наприклад: https://steamcommunity.com/openid/id/76561198...)
            claimed_id = query_params.get("openid.claimed_id", "")
            steam_id = claimed_id.split("/")[-1]
            return steam_id
            
        return None