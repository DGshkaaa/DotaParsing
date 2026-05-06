import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import LoginSuccess from './pages/LoginSuccess';
import Profile from './pages/Profile';
import HeroDetails from './pages/HeroDetails';
import MatchDetails from './pages/MatchDetails';
import PlayerProfile from './pages/PlayerProfile';
import AdminPanel from './pages/AdminPanel';
import News from './pages/News';
import Tournaments from './pages/Tournaments';
import './App.css';

// Виносимо логіку у внутрішній компонент, щоб useNavigate працював правильно (всередині Router)
function AppContent() {
  // Стан для перевірки, чи залогінений користувач
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Перевіряємо, чи є токен у пам'яті браузера
    const token = localStorage.getItem('token');
    const adminStatus = localStorage.getItem('is_admin') === 'true';
    if (token) {
      setIsLoggedIn(true);
      setIsAdmin(adminStatus);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('user_id');
    setIsLoggedIn(false);
    setIsAdmin(false);
    window.location.href = '/'; // Перезавантажуємо на головну
  };

  const loginWithSteam = () => {
    // Беремо URL з .env, а якщо його там немає (для підстраховки) - беремо локальний
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    // Відправляємо на наш бекенд, який перекине на Steam
    window.location.href = `${apiUrl}/auth/steam/login`;
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    if(searchId.trim()) {
      navigate(`/player/${searchId.trim()}`);
      setSearchId('');
    }
  };
  
  return (
    <div className="app-container">
      {/* НАВІГАЦІЯ (HEADER) */}
      <nav className="navbar">
        <Link to="/" className="logo">
          Dota<span className="logo-accent">Analytics</span>
        </Link>
        
        {/* МЕНЮ НАВІГАЦІЇ */}
        <div className="nav-menu">
          <Link to="/news" className="nav-link">Новини</Link>
          <Link to="/tournaments" className="nav-link">Турніри</Link>
        </div>

        <div className="nav-buttons">
          {isLoggedIn ? (
            <>
              <Link to="/profile" className="btn-profile">Кабінет</Link>
              {isAdmin && <Link to="/admin" className="btn-admin">Адмін</Link>}
              <button onClick={handleLogout} className="btn-logout">Вийти</button>
            </>
          ) : (
            <button onClick={loginWithSteam} className="btn-steam">
              Увійти через Steam
            </button>
          )}
        </div>
      </nav>

      {/* ПОШУК STEAM ID (ЦЕНТР) */}
      <div className="search-bar-container">
        <form onSubmit={handleSearch} className="search-form">
          <input 
            type="text" 
            placeholder="Пошук гравця по Steam ID" 
            value={searchId} 
            onChange={(e) => setSearchId(e.target.value)} 
            className="search-input"
          />
          <button type="submit" className="search-btn">
             ПОШУК
          </button>
        </form>
      </div>

      {/* МАРШРУТИЗАТОР СТОРІНОК */}
      <Routes>
        <Route path="/hero/:id" element={<HeroDetails />} />
        <Route path="/match/:matchId" element={<MatchDetails />} />
        <Route path="/player/:id" element={<PlayerProfile />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/news" element={<News />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  );
}

// Головний компонент тепер просто обгортає додаток у Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;