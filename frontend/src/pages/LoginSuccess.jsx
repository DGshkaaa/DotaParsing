import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function LoginSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Декодуємо JWT токен щоб отримати дані
      try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        
        localStorage.setItem('token', token);
        // Зберігаємо інформацію про адмін статус
        localStorage.setItem('is_admin', payload.is_admin ? 'true' : 'false');
        localStorage.setItem('user_id', payload.sub);
        
        console.log('✅ Авторизація успішна, is_admin:', payload.is_admin);
      } catch (err) {
        console.error('❌ Помилка парсування токена:', err);
      }
      
      window.location.href = '/profile';
    }
  }, [searchParams]);

  return <div className="loading-screen">Авторизація...</div>;
}

export default LoginSuccess;