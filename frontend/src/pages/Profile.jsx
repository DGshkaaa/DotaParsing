import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Profile() {
  const [matches, setMatches] = useState([]);
  const [heroes, setHeroes] = useState({});
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [statsFilter, setStatsFilter] = useState('all');
  const [displayCount, setDisplayCount] = useState(20);
  const [mainTab, setMainTab] = useState('matches'); // 'matches' або 'heroes'
  const [heroesTabIncludeTurbo, setHeroesTabIncludeTurbo] = useState(true);
  const [hoveredActivityDay, setHoveredActivityDay] = useState(null);
  const [heroSortBy, setHeroSortBy] = useState('picks'); // 'picks', 'wins', 'losses', 'winRate'
  const [heroSortDirection, setHeroSortDirection] = useState('desc'); // 'desc' або 'asc'
  const [includeGlobalTurbo, setIncludeGlobalTurbo] = useState(true); // глобальний фільтр турбо
  const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      try {
        setLoading(true);
        // Додаємо наш базовий URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

        const userRes = await axios.get(`${apiUrl}/users/me/info`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserInfo(userRes.data);

        const heroesRes = await axios.get(`${apiUrl}/heroes`);
        const mappedHeroes = {};
        Object.values(heroesRes.data).forEach(h => {
          mappedHeroes[h.id] = h;
        });
        setHeroes(mappedHeroes);

        const matchesRes = await axios.get(`${apiUrl}/users/me/matches`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setMatches(matchesRes.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Помилка завантаження профілю:", err.response?.data || err.message);
        setMatches([]);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setDisplayCount(20);
  }, [statsFilter, matches.length]);

  const getAllFilteredMatches = () => {
    return matches.filter(m => {
      if (statsFilter === 'ranked') return m.game_mode?.includes('RANKED');
      if (statsFilter === 'turbo') return m.game_mode === 'TURBO';
      return true;
    });
  };

  const getFilteredMatches = () => {
    return getAllFilteredMatches().slice(0, displayCount);
  };

  const getRankedMatches = () => {
    return matches.filter(m => m.game_mode?.includes('RANKED'));
  };

  // ФУНКЦІЯ для розрахунку статистики САЙДБАРА з урахуванням глобального фільтра турбо
  const getMatchesForSidebarStats = () => {
    return includeGlobalTurbo ? matches : matches.filter(m => m.game_mode !== 'TURBO');
  };
  
  const getTurboMatches = () => {
    return matches.filter(m => m.game_mode === 'TURBO');
  };

  const getNonTurboMatches = () => {
    return matches.filter(m => m.game_mode !== 'TURBO');
  };

  // ФУНКЦІЇ ФІЛЬТРУВАННЯ ДЛЯ РЕЖИМНОЇ СТАТИСТИКИ
  const getSingleDraftMatches = (matchList) => {
    return matchList.filter(m => m.game_mode?.includes('SINGLE_DRAFT') || m.game_mode === 'SINGLE_DRAFT');
  };

  const getAllPickMatches = (matchList) => {
    // All Pick без TURBO
    return matchList.filter(m => (m.game_mode?.includes('ALL_PICK') || m.game_mode === 'ALL_PICK') && m.game_mode !== 'TURBO');
  };

  const getRandomDraftMatches = (matchList) => {
    return matchList.filter(m => m.game_mode?.includes('RANDOM_DRAFT') || m.game_mode === 'RANDOM_DRAFT');
  };

  const getCaptainModeMatches = (matchList) => {
    return matchList.filter(m => m.game_mode?.includes('CAPTAINS_MODE') || m.game_mode === 'CAPTAINS_MODE');
  };
  
  const calculateStats = (matchList) => {
    const stats = { total: matchList.length, wins: 0, losses: 0, winRate: 0, avgKDA: [0, 0, 0] };
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    
    matchList.forEach(m => {
      const isRadiant = m.player_slot < 128;
      const won = isRadiant ? m.radiant_win : !m.radiant_win;
      if (won) stats.wins++;
      else stats.losses++;
      
      totalKills += m.kills || 0;
      totalDeaths += m.deaths || 0;
      totalAssists += m.assists || 0;
    });
    
    if (matchList.length > 0) {
      stats.winRate = ((stats.wins / matchList.length) * 100).toFixed(1);
      stats.avgKDA = [
        (totalKills / matchList.length).toFixed(1),
        (totalDeaths / matchList.length).toFixed(1),
        (totalAssists / matchList.length).toFixed(1)
      ];
    }
    return stats;
  };

  const getHeroStats = (matchList) => {
    const heroStats = {};
    matchList.forEach(m => {
      if (!heroStats[m.hero_id]) {
        heroStats[m.hero_id] = { picks: 0, wins: 0 };
      }
      heroStats[m.hero_id].picks++;
      const isRadiant = m.player_slot < 128;
      const won = isRadiant ? m.radiant_win : !m.radiant_win;
      if (won) heroStats[m.hero_id].wins++;
    });
    return heroStats;
  };

  const getMostPlayedHero = (matchList) => {
    const heroStats = getHeroStats(matchList);
    if (Object.keys(heroStats).length === 0) return null;
    return Object.keys(heroStats).reduce((a, b) => 
      heroStats[a].picks > heroStats[b].picks ? a : b
    );
  };

  const getHeroStatsInfo = (heroId, matchList) => {
    const heroStats = getHeroStats(matchList);
    if (!heroStats[heroId]) return null;
    const stats = heroStats[heroId];
    const winRate = stats.picks > 0 ? ((stats.wins / stats.picks) * 100).toFixed(1) : 0;
    return {
      picks: stats.picks,
      wins: stats.wins,
      losses: stats.picks - stats.wins,
      winRate
    };
  };

  const getAllHeroesStats = (matchList) => {
    const heroStats = getHeroStats(matchList);
    const heroesArray = [];
    
    Object.keys(heroStats).forEach(heroId => {
      const stats = heroStats[heroId];
      const winRate = stats.picks > 0 ? ((stats.wins / stats.picks) * 100).toFixed(1) : 0;
      heroesArray.push({
        heroId,
        picks: stats.picks,
        wins: stats.wins,
        losses: stats.picks - stats.wins,
        winRate
      });
    });
    
    // Сортуємо за кількістю ігор (спадаючо)
    return heroesArray.sort((a, b) => b.picks - a.picks);
  };

  const getBestHero = (matchList) => {
    const heroStats = getHeroStats(matchList);
    if (Object.keys(heroStats).length === 0) return null;
    
    // Фільтруємо героїв: мінімум 10 ігор та 52% вінрейт
    const qualifiedHeroes = Object.keys(heroStats).filter(heroId => {
      const picks = heroStats[heroId].picks;
      const winRate = picks > 0 ? (heroStats[heroId].wins / picks) * 100 : 0;
      return picks >= 10 && winRate >= 52;
    });
    
    if (qualifiedHeroes.length === 0) return null;
    
    return qualifiedHeroes.reduce((a, b) => {
      const wrA = heroStats[a].picks > 0 ? (heroStats[a].wins / heroStats[a].picks) * 100 : 0;
      const wrB = heroStats[b].picks > 0 ? (heroStats[b].wins / heroStats[b].picks) * 100 : 0;
      return wrA > wrB ? a : b;
    });
  };

  const filteredMatches = getFilteredMatches();
  const currentStats = calculateStats(getAllFilteredMatches());
  // Статистика для ЛІВОЇ ЧАСТИНИ (матчи, фільтри) - БЕЗ впливу глобального фільтра турбо
  const allStats = calculateStats(matches);
  const rankedStats = calculateStats(getRankedMatches());
  const turboStats = calculateStats(getTurboMatches());
  const nonTurboStats = calculateStats(getNonTurboMatches());
  // Статистика для САЙДБАРА - З впливом глобального фільтра турбо
  const sidebarMatches = getMatchesForSidebarStats();
  const sidebarAllStats = calculateStats(sidebarMatches);
  const sidebarRankedStats = calculateStats(sidebarMatches.filter(m => m.game_mode?.includes('RANKED')));
  const sidebarNonTurboStats = calculateStats(sidebarMatches.filter(m => m.game_mode !== 'TURBO'));
  const sidebarTurboStats = calculateStats(sidebarMatches.filter(m => m.game_mode === 'TURBO'));
  // Статистика окремих режимів
  const sidebarSingleDraftStats = calculateStats(getSingleDraftMatches(sidebarMatches));
  const sidebarAllPickStats = calculateStats(getAllPickMatches(sidebarMatches));
  const sidebarRandomDraftStats = calculateStats(getRandomDraftMatches(sidebarMatches));
  const sidebarCaptainModeStats = calculateStats(getCaptainModeMatches(sidebarMatches));

  const matchesForHeroesTab = heroesTabIncludeTurbo ? matches : getNonTurboMatches();
  // Для сайдбара використовуємо фільтровані матчи (з урахуванням глобального фільтра турбо)
  const mostPlayedHeroStats = getMostPlayedHero(sidebarMatches) ? getHeroStatsInfo(getMostPlayedHero(sidebarMatches), sidebarMatches) : null;
  const bestHeroStats = getBestHero(sidebarMatches) ? getHeroStatsInfo(getBestHero(sidebarMatches), sidebarMatches) : null;
  const allHeroesStats = getAllHeroesStats(matchesForHeroesTab);

  // Сортування героїв
  const sortedHeroesStats = useMemo(() => {
    const sorted = [...allHeroesStats];
    let result;
    switch (heroSortBy) {
      case 'picks':
        result = sorted.sort((a, b) => b.picks - a.picks);
        break;
      case 'wins':
        result = sorted.sort((a, b) => b.wins - a.wins);
        break;
      case 'losses':
        result = sorted.sort((a, b) => b.losses - a.losses);
        break;
      case 'winRate':
        result = sorted.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
        break;
      default:
        result = sorted;
    }
    
    if (heroSortDirection === 'asc') {
      result.reverse();
    }
    
    return result;
  }, [allHeroesStats, heroSortBy, heroSortDirection]);

  const handleHeroSort = (sortType) => {
    if (heroSortBy === sortType) {
      setHeroSortDirection(heroSortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setHeroSortBy(sortType);
      setHeroSortDirection('desc');
    }
  };

  const isWin = (m) => {
    const isRadiant = m.player_slot < 128;
    return isRadiant ? m.radiant_win : !m.radiant_win;
  };

  const getRankDisplay = () => {
    if (!userInfo?.rank_tier) return "UNRANKED";
    const ranks = {
      1: "HERALD", 2: "GUARDIAN", 3: "CRUSADER", 4: "ARCHON", 5: "LEGEND",
      6: "ANCIENT", 7: "DIVINE", 8: "IMMORTAL"
    };
    const tier = Math.floor(userInfo.rank_tier / 10);
    const stars = userInfo.rank_tier % 10;
    const rankName = ranks[tier] || "UNKNOWN";
    return stars > 0 ? `${rankName} ${stars}` : rankName;
  };

  // ФУНКЦІЯ: Малює медаль та зірки рангу
  const renderRankIcon = (tier) => {
    const baseUrl = "https://www.opendota.com/assets/images/dota2/rank_icons";
    if (!tier || tier === "0") {
      return <img src={`${baseUrl}/rank_icon_0.png`} alt="Unranked" style={{ height: '70px', width: '70px', margin: '0 auto' }} />;
    }
    const tierStr = tier.toString();
    if (tierStr.length !== 2) return null;

    const medal = tierStr[0];
    const star = tierStr[1];

    return (
      <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 10px auto' }} title={getRankDisplay()}>
        <img 
          src={`${baseUrl}/rank_icon_${medal}.png`} 
          alt="Medal" 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} 
        />
        {medal !== '8' && star !== '0' && (
          <img 
            src={`${baseUrl}/rank_star_${star}.png`} 
            alt="Star" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        )}
      </div>
    );
  };

  // ФУНКЦІЯ: Збирає дані для Карти Активності (Heatmap)
  const activityHeatmap = useMemo(() => {
    const activity = {};
    const matchesToUse = getMatchesForSidebarStats();
    
    matchesToUse.forEach(m => {
      if (!m.start_time) return;
      // start_time у секундах, конвертуємо в мілісекунди
      const date = new Date(m.start_time * 1000);
      const dateString = date.toISOString().split('T')[0];
      const won = isWin(m);
      if (!activity[dateString]) {
        activity[dateString] = { count: 0, wins: 0, losses: 0 };
      }
      activity[dateString].count += 1;
      if (won) activity[dateString].wins += 1;
      else activity[dateString].losses += 1;
    });

    const days = [];
    const today = new Date();
    // Генеруємо сітку за останні 98 днів (14 тижнів по 7 днів)
    for (let i = 97; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      days.push({
        date: dateString,
        count: activity[dateString]?.count || 0,
        wins: activity[dateString]?.wins || 0,
        losses: activity[dateString]?.losses || 0,
        displayDate: d.toLocaleDateString('uk-UA')
      });
    }
    return days;
  }, [matches, includeGlobalTurbo]);

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
      <p>ЗАВАНТАЖЕННЯ ОСОБИСТОЇ СТАТИСТИКИ...</p>
    </div>
  );

  const mostPlayedHeroId = getMostPlayedHero(sidebarMatches);
  const bestHeroId = getBestHero(sidebarMatches);
  const mostPlayedHero = mostPlayedHeroId ? heroes[mostPlayedHeroId] : null;
  const bestHero = bestHeroId ? heroes[bestHeroId] : null;

  return (
    <div className="profile-page fade-in">
      <div className="profile-layout" style={{ display: 'flex', gap: '30px', maxWidth: '1400px', margin: '0 auto', alignItems: 'flex-start' }}>
        
        {/* ЛІВА ЧАСТИНА: МАТЧИ ЧИ ГЕРОЇ */}
        <div className="matches-section" style={{ flex: '55' }}>
          <div className="section-header">
            <h3>{mainTab === 'matches' ? 'ІСТОРІЯ МАТЧІВ' : 'ВСІ ГЕРОЇ'}</h3>
            <span className="stats-hint">{mainTab === 'matches' ? 'СИНХРОНІЗОВАНО З STEAM' : 'СТАТИСТИКА ГЕРОЇВ'}</span>
          </div>

          {/* ВКЛАДКИ ПЕРЕКЛЮЧЕННЯ */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
            <button 
              className={`filter-btn ${mainTab === 'matches' ? 'active' : ''}`}
              onClick={() => setMainTab('matches')}
              style={{
                flex: 1,
                padding: '10px 15px',
                backgroundColor: mainTab === 'matches' ? '#c41e3a' : 'transparent',
                color: mainTab === 'matches' ? '#fff' : '#aaa',
                border: '1px solid #333',
                borderBottom: mainTab === 'matches' ? '2px solid #c41e3a' : 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
            >
              МАТЧИ
            </button>
            <button 
              className={`filter-btn ${mainTab === 'heroes' ? 'active' : ''}`}
              onClick={() => setMainTab('heroes')}
              style={{
                flex: 1,
                padding: '10px 15px',
                backgroundColor: mainTab === 'heroes' ? '#c41e3a' : 'transparent',
                color: mainTab === 'heroes' ? '#fff' : '#aaa',
                border: '1px solid #333',
                borderBottom: mainTab === 'heroes' ? '2px solid #c41e3a' : 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
            >
              ГЕРОЇ
            </button>
          </div>

          {mainTab === 'matches' && (
          <>
          <div className="filters-block">
            <button 
              className={`filter-btn ${statsFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatsFilter('all')}
            >
              ВСІ ({allStats.total})
            </button>
            <button 
              className={`filter-btn ${statsFilter === 'ranked' ? 'active' : ''}`}
              onClick={() => setStatsFilter('ranked')}
            >
              РЕЙТИНГ ({rankedStats.total})
            </button>
            <button 
              className={`filter-btn ${statsFilter === 'turbo' ? 'active' : ''}`}
              onClick={() => setStatsFilter('turbo')}
            >
              ТУРБО ({turboStats.total})
            </button>
          </div>

          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">Матчів</span>
              <span className="stat-value">{currentStats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Перемог</span>
              <span className="stat-value win">{currentStats.wins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Поразок</span>
              <span className="stat-value loss">{currentStats.losses}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">WR</span>
              <span className="stat-value wr">{currentStats.winRate}%</span>
            </div>
          </div>

          <div className="matches-list-container">
            {filteredMatches.map(m => {
              const hero = heroes[m.hero_id] || { localized_name: "Unknown", img: "" };
              const won = isWin(m);
              const durationMins = Math.floor(m.duration / 60);
              const durationSecs = (m.duration % 60).toString().padStart(2, '0');

              return (
                <Link key={m.match_id} to={`/match/${m.match_id}`} className={`match-card-stratz ${won ? 'win' : 'loss'}`}>
                  <div className="match-hero-section">
                    <img src={`${STEAM_CDN}${hero.img}`} className="match-hero-avatar" alt={hero.localized_name} />
                    <div className="match-hero-details">
                      <span className="match-hero-name">{hero.localized_name}</span>
                      <span className={`match-result-badge ${won ? 'win-badge' : 'loss-badge'}`}>
                        {won ? '✓ WIN' : '✗ LOSS'}
                      </span>
                    </div>
                  </div>

                  <div className="match-kda-section">
                    <span className="match-kda">{m.kills}/{m.deaths}/{m.assists}</span>
                  </div>

                  <div className="match-duration-section">
                    <span className="match-duration">{durationMins}:{durationSecs}</span>
                  </div>

                  <div className="match-meta-section">
                    <span className="match-mode">
                      {m.game_mode === 'TURBO' ? 'TURBO' : m.game_mode?.includes('RANKED') ? 'RANKED' : 'ALL PICK'}
                    </span>
                  </div>

                  <div className="match-arrow">
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {displayCount < matches.length && (
            <button 
              className="btn-load-more"
              onClick={() => setDisplayCount(displayCount + 20)}
            >
              ЗАВАНТАЖИТИ ЩЕ ({Math.min(displayCount + 20, matches.length)} з {matches.length})
            </button>
          )}
          </>
          )}

          {mainTab === 'heroes' && (
          <>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button
                onClick={() => setHeroesTabIncludeTurbo(!heroesTabIncludeTurbo)}
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  backgroundColor: heroesTabIncludeTurbo ? '#c41e3a' : '#1a1a1a',
                  color: heroesTabIncludeTurbo ? '#fff' : '#aaa',
                  border: `2px solid ${heroesTabIncludeTurbo ? '#c41e3a' : '#333'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: heroesTabIncludeTurbo ? '0 0 15px rgba(196, 30, 58, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 20px rgba(196, 30, 58, 0.5)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = heroesTabIncludeTurbo ? '0 0 15px rgba(196, 30, 58, 0.3)' : 'none';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <span>{heroesTabIncludeTurbo ? '✓' : '○'}</span>
                <span>Включати ТУРБО ({heroesTabIncludeTurbo ? matches.length : getNonTurboMatches().length} ігор)</span>
              </button>
            </div>

            {/* КНОПКИ СОРТУВАННЯ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleHeroSort('picks')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: heroSortBy === 'picks' ? '#c41e3a' : '#1a1a1a',
                  color: heroSortBy === 'picks' ? '#fff' : '#aaa',
                  border: `1px solid ${heroSortBy === 'picks' ? '#c41e3a' : '#333'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase'
                }}
              >
                По іграм {heroSortBy === 'picks' && (heroSortDirection === 'desc' ? '↓' : '↑')}
              </button>
              <button 
                onClick={() => handleHeroSort('wins')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: heroSortBy === 'wins' ? '#c41e3a' : '#1a1a1a',
                  color: heroSortBy === 'wins' ? '#fff' : '#aaa',
                  border: `1px solid ${heroSortBy === 'wins' ? '#c41e3a' : '#333'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase'
                }}
              >
                По перемогам {heroSortBy === 'wins' && (heroSortDirection === 'desc' ? '↓' : '↑')}
              </button>
              <button 
                onClick={() => handleHeroSort('losses')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: heroSortBy === 'losses' ? '#c41e3a' : '#1a1a1a',
                  color: heroSortBy === 'losses' ? '#fff' : '#aaa',
                  border: `1px solid ${heroSortBy === 'losses' ? '#c41e3a' : '#333'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase'
                }}
              >
                По поразкам {heroSortBy === 'losses' && (heroSortDirection === 'desc' ? '↓' : '↑')}
              </button>
              <button 
                onClick={() => handleHeroSort('winRate')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: heroSortBy === 'winRate' ? '#c41e3a' : '#1a1a1a',
                  color: heroSortBy === 'winRate' ? '#fff' : '#aaa',
                  border: `1px solid ${heroSortBy === 'winRate' ? '#c41e3a' : '#333'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase'
                }}
              >
                По WR {heroSortBy === 'winRate' && (heroSortDirection === 'desc' ? '↓' : '↑')}
              </button>
            </div>

            <div style={{ 
              backgroundColor: '#0a0a0a', 
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #222'
            }}>
              {sortedHeroesStats && sortedHeroesStats.length > 0 ? (
                <div style={{ 
                  maxHeight: '800px', 
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  '&::-webkit-scrollbar': { display: 'none' }
                }}
                className="custom-scrollbar">
                  <table style={{
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '12px'
                  }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', zIndex: 1 }}>
                      <tr style={{ borderBottom: '2px solid #333' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#c41e3a' }}>Герой</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: '#c41e3a', width: '60px' }}>Ігор</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: '#00ff88', width: '70px' }}>Перемог</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: '#ff6b6b', width: '70px' }}>Поразок</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: '#ffd700', width: '60px' }}>WR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHeroesStats.map((heroStat, idx) => {
                        const hero = heroes[heroStat.heroId];
                        if (!hero) return null;
                        const wrColor = heroStat.winRate >= 55 ? '#00ff88' : heroStat.winRate >= 50 ? '#ffeb3b' : '#ff6b6b';
                        
                        return (
                          <tr 
                            key={heroStat.heroId} 
                            style={{ 
                              borderBottom: '1px solid #1a1a1a',
                              backgroundColor: idx % 2 === 0 ? '#0f0f0f' : '#151515',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252525'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#0f0f0f' : '#151515'}
                          >
                            <td style={{ padding: '10px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img 
                                src={`${STEAM_CDN}${hero.img}`} 
                                alt={hero.localized_name}
                                style={{ width: '32px', height: '32px', borderRadius: '3px', flexShrink: 0, objectFit: 'cover' }}
                              />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#e0e0e0' }}>
                                {hero.localized_name}
                              </span>
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#fff' }}>
                              {heroStat.picks}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', color: '#00ff88', fontWeight: '600' }}>
                              {heroStat.wins}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', color: '#ff6b6b', fontWeight: '600' }}>
                              {heroStat.losses}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: wrColor }}>
                              {heroStat.winRate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
                  <p style={{ margin: 0 }}>Немає даних про героїв</p>
                </div>
              )}
            </div>
          </>
          )}
        </div>

        {/* ПРАВА ЧАСТИНА: САЙДБАР (ЗРОБИЛИ ШИРШЕ) */}
        <aside className="account-sidebar" style={{ flex: '45', minWidth: '350px' }}>
          <div className="account-card-modern">
            {userInfo && (
              <>
                <div className="avatar-container">
                  <div className="avatar-glow"></div>
                  {userInfo.avatar ? (
                    <img src={userInfo.avatar} alt="avatar" className="user-avatar-img" />
                  ) : (
                    <div className="user-avatar-placeholder">👤</div>
                  )}
                </div>

                <h2 className="user-nickname">{userInfo.nickname || "DOTA PLAYER"}</h2>

                <div className="rank-badge" style={{ textAlign: 'center', marginBottom: '20px' }}>
                  {/* ВЕЛИКА ІКОНКА РАНГУ ЗВЕРХУ */}
                  {renderRankIcon(userInfo.rank_tier)}
                  <span className="rank-text" style={{ fontSize: '18px', fontWeight: 'bold' }}>{getRankDisplay()}</span>
                  {userInfo.leaderboard_rank && (
                    <span className="leaderboard-rank" style={{ display: 'block', marginTop: '5px' }}>#{userInfo.leaderboard_rank}</span>
                  )}
                </div>

                <div className="divider-red"></div>

                {/* ACTIVITY HEATMAP (ЯК В STRATZ) */}
                <div className="stats-section-title">АКТИВНІСТЬ: ОСТАННІ 14 ТИЖНІВ</div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateRows: 'repeat(7, 1fr)', 
                  gridAutoFlow: 'column', 
                  gap: '4px', 
                  marginTop: '15px',
                  marginBottom: '20px',
                  padding: '10px',
                  backgroundColor: '#111',
                  borderRadius: '6px',
                  overflow: 'visible',
                  position: 'relative'
                }}>
                  {activityHeatmap.map((day, i) => {
                    let color = '#222'; // 0 ігор
                    if (day.count > 0 && day.count <= 2) color = '#4caf50'; // 1-2 гри (зелений)
                    else if (day.count > 2 && day.count <= 5) color = '#cddc39'; // 3-5 ігор (жовто-зелений)
                    else if (day.count > 5) color = '#ff9800'; // 6+ ігор (оранжевий/гарячий)
                    
                    const isHovered = hoveredActivityDay === i;
                    
                    return (
                      <div 
                        key={i}
                        style={{
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: color, 
                          borderRadius: '2px', 
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease',
                          position: 'relative',
                          transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                          transformOrigin: 'center'
                        }}
                        onMouseEnter={() => {
                          setHoveredActivityDay(i);
                        }}
                        onMouseLeave={() => {
                          setHoveredActivityDay(null);
                        }}
                      >
                        {isHovered && (
                          <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: '#0a0a0a',
                            color: '#e0e0e0',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            zIndex: 1000,
                            border: '2px solid #c41e3a',
                            boxShadow: '0 6px 20px rgba(196, 30, 58, 0.4), inset 0 0 10px rgba(196, 30, 58, 0.1)',
                            pointerEvents: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            animation: 'fadeIn 0.15s ease-out'
                          }}>
                            <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '10px' }}>{day.displayDate}</div>
                            <div style={{ fontSize: '10px', color: '#aaa', borderTop: '1px solid #333', paddingTop: '4px' }}>
                              {day.count} {day.count === 1 ? 'гра' : 'ігор'}
                            </div>
                            <div style={{ fontSize: '11px', display: 'flex', gap: '3px', fontWeight: 'bold', justifyContent: 'center' }}>
                              <span style={{ color: '#00ff88' }}>{day.wins}</span>
                              <span style={{ color: '#999' }}>\</span>
                              <span style={{ color: '#ff6b6b' }}>{day.losses}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="divider-red"></div>

                <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setIncludeGlobalTurbo(!includeGlobalTurbo)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      backgroundColor: includeGlobalTurbo ? '#c41e3a' : '#1a1a1a',
                      color: includeGlobalTurbo ? '#fff' : '#aaa',
                      border: `2px solid ${includeGlobalTurbo ? '#c41e3a' : '#333'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: includeGlobalTurbo ? '0 0 15px rgba(196, 30, 58, 0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = '0 0 20px rgba(196, 30, 58, 0.5)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = includeGlobalTurbo ? '0 0 15px rgba(196, 30, 58, 0.3)' : 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>{includeGlobalTurbo ? '✓' : '○'}</span>
                    <span>Включати ТУРБО</span>
                  </button>
                </div>

                <div className="divider-red"></div>

                <div className="stats-section-title">ЗАГАЛЬНА СТАТИСТИКА</div>

                <div className="quick-stats-grid">
                  <div className="q-stat">
                    <span className="q-label">ВСЬОГО ІГР</span>
                    <span className="q-value">{sidebarAllStats.total}</span>
                  </div>
                  <div className="q-stat">
                    <span className="q-label">ПЕРЕМОГИ</span>
                    <span className="q-value" style={{color: '#00ff88'}}>{sidebarAllStats.wins}</span>
                  </div>
                  <div className="q-stat">
                    <span className="q-label">ПОРАЗКИ</span>
                    <span className="q-value" style={{color: '#ff4d4d'}}>{sidebarAllStats.losses}</span>
                  </div>
                  <div className="q-stat">
                    <span className="q-label">ВІНРЕЙТ</span>
                    <span className="q-value" style={{color: '#ffd700'}}>{sidebarAllStats.winRate}%</span>
                  </div>
                </div>

                <div className="divider-red"></div>

                <div className="stats-section-title">СЕРЕДНЯ КДА</div>
                <div className="avg-kda-display">
                  <div className="kda-value">{sidebarAllStats.avgKDA[0]}</div>
                  <span className="kda-sep">/</span>
                  <div className="kda-value">{sidebarAllStats.avgKDA[1]}</div>
                  <span className="kda-sep">/</span>
                  <div className="kda-value">{sidebarAllStats.avgKDA[2]}</div>
                </div>

                <div className="divider-red"></div>

                <div className="stats-section-title">ТОП ГЕРОЇ</div>

                {mostPlayedHero && mostPlayedHeroStats && (
                  <div style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(196, 30, 58, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0f0f0f';
                    e.currentTarget.style.borderColor = '#222';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#c41e3a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>НАЙБІЛЬШЕ ПІКНУТО</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img src={`${STEAM_CDN}${mostPlayedHero.img}`} alt={mostPlayedHero.localized_name} style={{ width: '56px', height: '56px', borderRadius: '4px' }} />
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e0e0e0', marginBottom: '2px' }}>{mostPlayedHero.localized_name}</div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>{mostPlayedHeroStats.picks} ігор</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', backgroundColor: '#050505', padding: '8px', borderRadius: '6px', marginTop: '10px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>Перемог</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00ff88' }}>{mostPlayedHeroStats.wins}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>Поразок</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff6b6b' }}>{mostPlayedHeroStats.losses}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>WR</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffd700' }}>{mostPlayedHeroStats.winRate}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {bestHero && bestHeroStats && (
                  <div style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(196, 30, 58, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0f0f0f';
                    e.currentTarget.style.borderColor = '#222';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#c41e3a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>НАЙКРАЩИЙ ВІН-РЕЙТ</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img src={`${STEAM_CDN}${bestHero.img}`} alt={bestHero.localized_name} style={{ width: '56px', height: '56px', borderRadius: '4px' }} />
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e0e0e0', marginBottom: '2px' }}>{bestHero.localized_name}</div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>{bestHeroStats.picks} ігор</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', backgroundColor: '#050505', padding: '8px', borderRadius: '6px', marginTop: '10px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>Перемог</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00ff88' }}>{bestHeroStats.wins}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>Поразок</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff6b6b' }}>{bestHeroStats.losses}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>WR</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffd700' }}>{bestHeroStats.winRate}%</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="divider-red"></div>

                <div className="stats-section-title">РЕЖИМНА СТАТИСТИКА</div>

                <div className="mode-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="mode-stat-item">
                    <span className="mode-label"> РЕЙТИНГОВІ</span>
                    <span className="mode-value">{sidebarRankedStats.total} ({sidebarRankedStats.winRate}%)</span>
                  </div>
                  <div className="mode-stat-item">
                    <span className="mode-label"> ВСЕ КРІМ ТУРБО</span>
                    <span className="mode-value">{sidebarNonTurboStats.total} ({sidebarNonTurboStats.winRate}%)</span>
                  </div>
                  <div className="mode-stat-item">
                    <span className="mode-label"> ТУРБО</span>
                    <span className="mode-value">{sidebarTurboStats.total} ({sidebarTurboStats.winRate}%)</span>
                  </div>
                  <div className="mode-stat-item">
                    <span className="mode-label"> ALL PICK</span>
                    <span className="mode-value">{sidebarAllPickStats.total} ({sidebarAllPickStats.winRate}%)</span>
                  </div>
                  <div className="mode-stat-item">
                    <span className="mode-label"> SINGLE DRAFT</span>
                    <span className="mode-value">{sidebarSingleDraftStats.total} ({sidebarSingleDraftStats.winRate}%)</span>
                  </div>
                  <div className="mode-stat-item">
                    <span className="mode-label"> RANDOM DRAFT</span>
                    <span className="mode-value">{sidebarRandomDraftStats.total} ({sidebarRandomDraftStats.winRate}%)</span>
                  </div>
                  <div className="mode-stat-item">
                    <span className="mode-label"> CAPTAIN MODE</span>
                    <span className="mode-value">{sidebarCaptainModeStats.total} ({sidebarCaptainModeStats.winRate}%)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Profile;