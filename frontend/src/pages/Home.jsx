import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';


function Home() {
  const [heroes, setHeroes] = useState([]);
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);

  const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const response = await axios.get(`${apiUrl}/heroes`);
        setHeroes(Object.values(response.data));
        setLoading(false);
      } catch (error) {
        console.error("Критична помилка завантаження героїв:", error);
        setLoading(false);
      }
    };
    fetchHeroes();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // ЛОГІКА СКЛАДНОСТІ (Зірочки)
  const getComplexityStars = (heroName) => {
    const tier3 = ["Invoker", "Meepo", "Arc Warden", "Chen", "Visage", "Morphling", "Earth Spirit", "Io", "Tinker"];
    const tier2 = ["Puck", "Lone Druid", "Rubick", "Ember Spirit", "Storm Spirit", "Shadow Fiend"];
    
    if (tier3.includes(heroName)) return "★★★";
    if (tier2.includes(heroName)) return "★★☆";
    return "★☆☆";
  };

  // ЛОГІКА АНАЛІТИКИ (Avg WR vs Elite WR)
  const getStats = (h) => {
    // Всі публічні матчі (1-8 ранги)
    const allPicks = (h['1_pick'] || 0) + (h['2_pick'] || 0) + (h['3_pick'] || 0) + (h['4_pick'] || 0) + (h['5_pick'] || 0) + (h['6_pick'] || 0) + (h['7_pick'] || 0) + (h['8_pick'] || 0);
    const allWins = (h['1_win'] || 0) + (h['2_win'] || 0) + (h['3_win'] || 0) + (h['4_win'] || 0) + (h['5_win'] || 0) + (h['6_win'] || 0) + (h['7_win'] || 0) + (h['8_win'] || 0);
    
    const avgWr = allPicks > 0 ? (allWins / allPicks * 100).toFixed(1) : "0.0";
    
    // Elite MMR (Rank 7-8: Divine & Immortal)
    const highPicks = (h['7_pick'] || 0) + (h['8_pick'] || 0);
    const highWins = (h['7_win'] || 0) + (h['8_win'] || 0);
    const highWr = highPicks > 0 ? (highWins / highPicks * 100).toFixed(1) : "0.0";

    // Різниця (Trend)
    const trend = (highWr - avgWr).toFixed(1);

    return { avgWr, highWr, allPicks, trend };
  };

  // КЛАСИ ДЛЯ АТРИБУТІВ
  const attrClass = (attr) => {
    switch(attr) {
      case 'str': return 'attr-str';
      case 'agi': return 'attr-agi';
      case 'int': return 'attr-int';
      default: return 'attr-uni';
    }
  };

  // ЛОГІКА СОРТУВАННЯ за всіма параметрами
  const sortedHeroes = [...heroes].sort((a, b) => {
    let comparison = 0;

    if (sortField === 'name') {
      comparison = a.localized_name.localeCompare(b.localized_name);
    } else if (sortField === 'avgWr') {
      const statsA = getStats(a);
      const statsB = getStats(b);
      comparison = parseFloat(statsA.avgWr) - parseFloat(statsB.avgWr);
    } else if (sortField === 'eliteWr') {
      const statsA = getStats(a);
      const statsB = getStats(b);
      comparison = parseFloat(statsA.highWr) - parseFloat(statsB.highWr);
    } else if (sortField === 'trend') {
      const statsA = getStats(a);
      const statsB = getStats(b);
      comparison = parseFloat(statsA.trend) - parseFloat(statsB.trend);
    } else if (sortField === 'complexity') {
      const complexA = getComplexityStars(a.localized_name).length;
      const complexB = getComplexityStars(b.localized_name).length;
      comparison = complexA - complexB;
    } else if (sortField === 'matches') {
      const statsA = getStats(a);
      const statsB = getStats(b);
      comparison = statsA.allPicks - statsB.allPicks;
    }

    return sortAsc ? comparison : -comparison;
  });

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
      <p>СИНХРОНІЗАЦІЯ З МЕТОЮ...</p>
    </div>
  );

  return (
    <div className="main-content fade-in">
      <div className="page-header">
        <div className="header-titles">
          <h2>META TRENDS</h2>
          <span className="subtitle">АНАЛІТИКА ТРЕНДІВ ТА ЕФЕКТИВНОСТІ ГЕРОЇВ</span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="heroes-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className={`sortable ${sortField === 'name' ? 'active' : ''}`}>
                ГЕРОЙ {sortField === 'name' && (sortAsc ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('avgWr')} className={`sortable ${sortField === 'avgWr' ? 'active' : ''}`}>
                AVG WR {sortField === 'avgWr' && (sortAsc ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('eliteWr')} className={`sortable ${sortField === 'eliteWr' ? 'active' : ''}`}>
                ELITE WR (7-8k+) {sortField === 'eliteWr' && (sortAsc ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('trend')} className={`sortable ${sortField === 'trend' ? 'active' : ''}`}>
                TREND {sortField === 'trend' && (sortAsc ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('complexity')} className={`sortable ${sortField === 'complexity' ? 'active' : ''}`}>
                COMPLEXITY {sortField === 'complexity' && (sortAsc ? '▲' : '▼')}
              </th>
              <th>ROLES</th>
              <th onClick={() => handleSort('matches')} className={`sortable ${sortField === 'matches' ? 'active' : ''}`}>
                TOTAL MATCHES {sortField === 'matches' && (sortAsc ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedHeroes.map(h => {
              const s = getStats(h);
              return (
                <tr key={h.id} className="hero-row">
                  {/* Герой: Фото + Назва + Атрибут */}
                  <td>
                    <div className="hero-info-cell">
                      <div className="avatar-wrapper">
                        <img src={`${STEAM_CDN}${h.img}`} className="hero-avatar" alt={h.localized_name} />
                      </div>
                      <div className="name-box">
                        <Link to={`/hero/${h.id}`} className={`hero-main-link ${attrClass(h.primary_attr)}`}>
                          {h.localized_name}
                        </Link>
                        <span className="hero-subtext">{h.attack_type}</span>
                      </div>
                    </div>
                  </td>

                  {/* Загальний вінрейт */}
                  <td className="stat-value">{s.avgWr}%</td>

                  {/* Елітний вінрейт */}
                  <td>
                    <span className={`wr-value ${s.highWr > 52 ? 'high-wr' : s.highWr < 48 ? 'low-wr' : ''}`}>
                      {s.highWr}%
                    </span>
                  </td>

                  {/* Тренд */}
                  <td>
                    <div className={`trend-box ${s.trend > 0 ? 'trend-up' : 'trend-down'}`}>
                      {s.trend > 0 ? `▲ +${s.trend}` : `▼ ${s.trend}`}%
                    </div>
                  </td>

                  {/* Складність */}
                  <td className="complexity-cell">
                    <span className="stars">{getComplexityStars(h.localized_name)}</span>
                  </td>

                  {/* Ролі */}
                  <td>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                      {h.roles.slice(0, 2).map(role => (
                        <span key={role} className="role-badge">{role}</span>
                      ))}
                    </div>
                  </td>

                  {/* Кількість матчів */}
                  <td className="stat-value picks-count">
                    {s.allPicks.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Home;