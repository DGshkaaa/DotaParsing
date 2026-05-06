import httpx
import asyncio
import json

async def test():
    async with httpx.AsyncClient() as client:
        # Используем демо API ключ для тестирования
        headers = {'Authorization': 'Bearer YOUR_TEST_KEY', 'Accept': 'application/json'}
        try:
            resp = await client.get('https://api.pandascore.co/dota2/series/past', headers=headers, params={'per_page': 3}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                # Выводим первые три турнира
                for i, t in enumerate(data[:3]):
                    print(f'\n=== Турнір {i+1} ===')
                    print(f'ID: {t.get("id")}')
                    print(f'Full Name: {t.get("full_name")}')
                    print(f'Winner ID: {t.get("winner_id")} (тип: {type(t.get("winner_id")).__name__})')
                    print(f'Prizepool: {t.get("prizepool")}')
                    
                    # Проверяем структуру winner_id
                    winner_id = t.get("winner_id")
                    if isinstance(winner_id, dict):
                        print(f'  Winner ID = Dict: {winner_id}')
                    
                    # Проверяем serie
                    if t.get('serie'):
                        serie = t.get('serie')
                        print(f'Serie Winner ID: {serie.get("winner_id")} (тип: {type(serie.get("winner_id")).__name__})')
                        print(f'Serie Prizepool: {serie.get("prizepool")}')
            else:
                print(f'Error: {resp.status_code} - {resp.text}')
        except Exception as e:
            print(f'Exception: {e}')

asyncio.run(test())
