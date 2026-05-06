import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * HERO DETAILS PAGE: PRO MATCHES LIST
 * Сторінка зі списком професійних матчів конкретного героя
 */
function HeroDetails() {
  const { id } = useParams();
  const [proMatches, setProMatches] = useState([]);
  const [heroInfo, setHeroInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

  // Допоміжна функція для форматування дати з Unix timestamp
  const formatDate = (unixTimestamp) => {
    if (!unixTimestamp) return "Невідомо";
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Додаємо наш базовий URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        
        // 1. Отримуємо дані про самого героя з нашого бекенду
        const heroesRes = await axios.get(`${apiUrl}/heroes`);
        const heroesArray = Object.values(heroesRes.data);
        const currentHero = heroesArray.find(h => h.id.toString() === id.toString());
        setHeroInfo(currentHero);

        // 2. Отримуємо список останніх професійних матчів (ЦЕ ЗАЛИШАЄМО БЕЗ ЗМІН!)
        const matchesRes = await axios.get(`https://api.opendota.com/api/heroes/${id}/matches`);
        setProMatches(matchesRes.data.slice(0, 20)); // Беремо останні 20 матчів
        
        setLoading(false);
      } catch (error) {
        console.error("Помилка при завантаженні даних героя:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
      <p>АНАЛІЗ ПРОФЕСІЙНИХ ТУРНІРІВ...</p>
    </div>
  );

  return (
    <div className="main-content fade-in">
      {/* ШАПКА ГЕРОЯ */}
      {heroInfo && (
        <div className="hero-detail-header" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img 
            src={`${STEAM_CDN}${heroInfo.img}`} 
            className="hero-large-portrait" 
            alt={heroInfo.localized_name} 
            style={{ width: '150px', height: 'auto', borderRadius: '4px', border: '2px solid #333' }}
          />
          <div className="hero-header-info">
            <h1 style={{ margin: '0 0 10px 0', color: '#fff' }}>{heroInfo.localized_name.toUpperCase()}</h1>
            <div className="hero-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className={`attr-badge ${heroInfo.primary_attr}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {heroInfo.primary_attr}
              </span>
              <span className="attack-type-badge" style={{ padding: '4px 8px', backgroundColor: '#333', color: '#ccc', borderRadius: '4px', fontSize: '12px' }}>
                {heroInfo.attack_type}
              </span>
              {heroInfo.roles.map(role => (
                <span key={role} className="role-tag" style={{ padding: '4px 8px', backgroundColor: '#2a2a2a', color: '#aaa', borderRadius: '4px', fontSize: '12px' }}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="section-divider" style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ color: '#ccc', margin: 0, fontSize: '16px' }}>ОСТАННІ ПРОФЕСІЙНІ МАТЧІ (HIGH MMR BUILDS)</h3>
      </div>

      {/* СПИСОК МАТЧІВ */}
      <div className="pro-matches-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {proMatches.map(m => {
          const isWin = (m.radiant && m.radiant_win) || (!m.radiant && !m.radiant_win);
          
          return (
            <div key={m.match_id} className={`match-card-pro`} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '15px 20px', 
                backgroundColor: '#1a1a1a', 
                borderRadius: '6px',
                borderLeft: `4px solid ${isWin ? '#28a745' : '#dc3545'}`,
                borderRight: '1px solid #333',
                borderTop: '1px solid #333',
                borderBottom: '1px solid #333'
            }}>
              
              <div className="match-main-info" style={{ flex: '1' }}>
                <div className="league-box" style={{ marginBottom: '5px' }}>
                  <span className="league-label" style={{ fontSize: '10px', color: '#888', marginRight: '5px' }}>ТУРНІР</span>
                  <span className="league-name" style={{ color: '#fff', fontSize: '14px' }}>{m.league_name || "Professional Match"}</span>
                </div>
                
                <div className="match-id-box">
                  <span className="sub-label" style={{ fontSize: '10px', color: '#888', marginRight: '5px' }}>MATCH ID</span>
                  <span className="id-value" style={{ color: '#aaa', fontSize: '12px' }}>{m.match_id}</span>
                </div>
              </div>

              <div className="match-meta-info" style={{ flex: '1', textAlign: 'center' }}>
                <div className={`result-status`} style={{ color: isWin ? '#28a745' : '#dc3545', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                  ПІДСУМОК: {isWin ? "WIN" : "LOSS"}
                </div>
                <div className="duration-label" style={{ color: '#888', fontSize: '12px' }}>
                  {(m.duration / 60).toFixed(0)} ХВ • {formatDate(m.start_time)}
                </div>
              </div>

              <div className="action-box" style={{ flex: '1', display: 'flex', justifyContent: 'flex-end' }}>
                <Link to={`/match/${m.match_id}`} className="btn-analyze" style={{
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: 'background-color 0.2s'
                }}>
                  АНАЛІЗ БІЛДУ ТА ТАЙМЛАЙНУ
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HeroDetails;