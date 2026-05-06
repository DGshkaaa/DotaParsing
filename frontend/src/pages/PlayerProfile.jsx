import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

function PlayerProfile() {
  const { id } = useParams();
  const [playerData, setPlayerData] = useState(null);
  const [heroes, setHeroes] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [excludeTurbo, setExcludeTurbo] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');

  const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

  const getRankName = (tier) => {
    if (!tier) return "UNRANKED";
    if (tier.toString() === "80") return "Титан (Immortal)";
    
    const tierStr = tier.toString();
    if (tierStr.length !== 2) return "UNKNOWN";
    
    const ranks = {
      '1': 'Рекрут',
      '2': 'Страж',
      '3': 'Лицар',
      '4': 'Герой',
      '5': 'Легенда',
      '6': 'Володар',
      '7': 'Божество'
    };
    
    const rankName = ranks[tierStr[0]];
    const stars = tierStr[1];
    
    return rankName ? `${rankName} ${stars}` : "UNRANKED";
  };

  const renderRankIcon = (tier) => {
    const baseUrl = "https://www.opendota.com/assets/images/dota2/rank_icons";
    
    if (!tier || tier === "0") {
      return <img src={`${baseUrl}/rank_icon_0.png`} alt="Unranked" style={{ height: '90px', width: '90px' }} />;
    }

    const tierStr = tier.toString();
    if (tierStr.length !== 2) return null;

    const medal = tierStr[0];
    const star = tierStr[1];

    return (
      <div style={{ position: 'relative', width: '90px', height: '90px' }} title={getRankName(tier)}>
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

  useEffect(() => {
    const fetchPlayerInfo = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        
        const heroesRes = await axios.get(`${apiUrl}/heroes`);
        const mappedHeroes = {};
        Object.values(heroesRes.data).forEach(h => mappedHeroes[h.id] = h);
        setHeroes(mappedHeroes);

        const res = await axios.get(`${apiUrl}/players/${id}`);
        setPlayerData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Помилка завантаження профілю:", err);
        setLoading(false);
      }
    };
    fetchPlayerInfo();
  }, [id]);

  const { stats, topHeroes, allHeroesStats, recentMatches } = useMemo(() => {
    if (!playerData || !playerData.matches) return { stats: {}, topHeroes: [], allHeroesStats: [], recentMatches: [] };
    
    const allMatches = playerData.matches;

    const modeStats = {
      turbo: { games: 0, wins: 0 },
      allPick: { games: 0, wins: 0 },
      rankedAllPick: { games: 0, wins: 0 },
      singleDraft: { games: 0, wins: 0 },
      captainsMode: { games: 0, wins: 0 }
    };

    let totalWins = 0, rankedWins = 0, rankedGames = 0, unrankedWins = 0, unrankedGames = 0;

    allMatches.forEach(m => {
      const isWin = (m.player_slot < 128 && m.radiant_win) || (m.player_slot >= 128 && !m.radiant_win);
      if (isWin) totalWins++;

      const lobbyStr = String(m.lobby_type).toUpperCase();
      const gmStr = String(m.game_mode).toUpperCase();
      const gmNum = Number(m.game_mode);

      // Визначаємо чи це ранкед лобі (для лівої колонки)
      const isRanked = m.lobby_type === 7 || (lobbyStr.includes('RANKED') && !lobbyStr.includes('UNRANKED'));
      
      if (isRanked) {
        rankedGames++;
        if (isWin) rankedWins++;
      } else {
        unrankedGames++;
        if (isWin) unrankedWins++;
      }

      // Визначаємо моди
      const isTurbo = gmNum === 23 || gmStr.includes('TURBO');
      const isSingleDraft = gmNum === 4 || gmStr.includes('SINGLE_DRAFT');
      const isCaptainsMode = gmNum === 2 || gmStr.includes('CAPTAINS_MODE');
      
      // Будь-який вид All Pick або All Draft
      const isSomeAllPick = gmNum === 1 || gmNum === 22 || gmStr.includes('PICK') || gmStr.includes('ALL_DRAFT');

      // ЖОРСТКИЙ РОЗПОДІЛ:
      // Якщо це All Pick і зіграний у Ranked -> Ranked All Pick
      // Якщо це All Pick і зіграний у Unranked -> звичайний All Pick
      const isRankedAllPick = isSomeAllPick && isRanked && !isTurbo && !isSingleDraft && !isCaptainsMode;
      const isAllPick = isSomeAllPick && !isRanked && !isTurbo && !isSingleDraft && !isCaptainsMode;

      // Розподіляємо по статистиці
      if (isTurbo) { modeStats.turbo.games++; if (isWin) modeStats.turbo.wins++; }
      else if (isRankedAllPick) { modeStats.rankedAllPick.games++; if (isWin) modeStats.rankedAllPick.wins++; }
      else if (isAllPick) { modeStats.allPick.games++; if (isWin) modeStats.allPick.wins++; }
      else if (isSingleDraft) { modeStats.singleDraft.games++; if (isWin) modeStats.singleDraft.wins++; }
      else if (isCaptainsMode) { modeStats.captainsMode.games++; if (isWin) modeStats.captainsMode.wins++; }
    });

    const calcWr = (wins, total) => total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    const statsObj = {
      totalGames: allMatches.length,
      overallWr: calcWr(totalWins, allMatches.length),
      rankedWr: calcWr(rankedWins, rankedGames),
      rankedGames,
      unrankedWr: calcWr(unrankedWins, unrankedGames),
      unrankedGames,
      turboWr: calcWr(modeStats.turbo.wins, modeStats.turbo.games),
      turboGames: modeStats.turbo.games,
      allPickWr: calcWr(modeStats.allPick.wins, modeStats.allPick.games),
      allPickGames: modeStats.allPick.games,
      rankedAllPickWr: calcWr(modeStats.rankedAllPick.wins, modeStats.rankedAllPick.games),
      rankedAllPickGames: modeStats.rankedAllPick.games,
      singleDraftWr: calcWr(modeStats.singleDraft.wins, modeStats.singleDraft.games),
      singleDraftGames: modeStats.singleDraft.games,
      captainsModeWr: calcWr(modeStats.captainsMode.wins, modeStats.captainsMode.games),
      captainsModeGames: modeStats.captainsMode.games,
    };

    const filteredMatches = allMatches.filter(m => {
      const gmStr = String(m.game_mode).toUpperCase();
      const isTurbo = Number(m.game_mode) === 23 || gmStr.includes('TURBO');
      if (excludeTurbo && isTurbo) return false;
      return true;
    });

    const heroCounts = {};
    filteredMatches.forEach(m => {
      const isWin = (m.player_slot < 128 && m.radiant_win) || (m.player_slot >= 128 && !m.radiant_win);
      if (m.hero_id) {
        if (!heroCounts[m.hero_id]) heroCounts[m.hero_id] = { id: m.hero_id, games: 0, wins: 0, losses: 0 };
        heroCounts[m.hero_id].games++;
        if (isWin) heroCounts[m.hero_id].wins++;
        else heroCounts[m.hero_id].losses++;
      }
    });

    const sortedAllHeroes = Object.values(heroCounts).sort((a, b) => b.games - a.games);
    const topHeroesList = sortedAllHeroes.slice(0, 5);

    return { 
      stats: statsObj, 
      topHeroes: topHeroesList, 
      allHeroesStats: sortedAllHeroes,
      recentMatches: filteredMatches.slice(0, 20) 
    };
  }, [playerData, excludeTurbo]);

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
      <p>АНАЛІЗУЄМО БАЗУ ДАНИХ ГРАВЦЯ...</p>
    </div>
  );

  if (!playerData || !playerData.profile) return (
    <div className="main-content fade-in" style={{textAlign: 'center', marginTop: '100px'}}>
      <h2>Гравця не знайдено</h2>
      <p style={{color: '#ff4d4d'}}>Перевір правильність Steam ID.</p>
    </div>
  );

  const { profile, rank_tier } = playerData.profile;
  const mostPlayedHeroData = topHeroes.length > 0 ? topHeroes[0] : null;
  const mostPlayedHeroInfo = mostPlayedHeroData ? heroes[mostPlayedHeroData.id] : null;

  return (
    <div className="main-content fade-in">
      
      <div className="hero-detail-header" style={{ 
        marginBottom: '20px', padding: '20px', backgroundColor: '#1a1a1a', 
        borderRadius: '8px', display: 'flex', alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img 
            src={profile.avatarfull || 'https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png'} 
            alt="Avatar" 
            style={{ width: '100px', height: '100px', borderRadius: '8px', border: '2px solid #dc3545' }}
          />
          <div className="hero-header-info">
            <h1 style={{ margin: '0 0 10px 0', color: '#fff' }}>{profile.personaname}</h1>
            <div className="hero-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#28a745', color: '#fff' }}>
                РАНГ: {getRankName(rank_tier)}
              </span>
              <span style={{ padding: '4px 10px', backgroundColor: '#333', color: '#ccc', borderRadius: '4px', fontSize: '13px' }}>
                STEAM ID: {id}
              </span>
            </div>
          </div>
        </div>
        <div style={{ paddingRight: '20px' }}>
          {renderRankIcon(rank_tier)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        
        <div style={{ flex: '2', minWidth: '300px', backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#ccc', margin: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>ГЛОБАЛЬНА СТАТИСТИКА РЕЖИМІВ</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>Всі матчі ({stats.totalGames})</span>
                <strong style={{ color: stats.overallWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.overallWr}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>Ranked ({stats.rankedGames})</span>
                <strong style={{ color: stats.rankedWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.rankedWr}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>Unranked ({stats.unrankedGames})</span>
                <strong style={{ color: stats.unrankedWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.unrankedWr}%</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>All Pick ({stats.allPickGames})</span>
                <strong style={{ color: stats.allPickWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.allPickWr}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>Ranked All Pick ({stats.rankedAllPickGames})</span>
                <strong style={{ color: stats.rankedAllPickWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.rankedAllPickWr}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>Turbo ({stats.turboGames})</span>
                <strong style={{ color: stats.turboWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.turboWr}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>Single Draft ({stats.singleDraftGames})</span>
                <strong style={{ color: stats.singleDraftWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.singleDraftWr}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a', paddingBottom: '5px' }}>
                <span style={{ color: '#888' }}>Captains Mode ({stats.captainsModeGames})</span>
                <strong style={{ color: stats.captainsModeWr >= 50 ? '#28a745' : '#dc3545' }}>{stats.captainsModeWr}%</strong>
              </div>
            </div>
          </div>
        </div>

        {mostPlayedHeroInfo && (
          <div style={{ flex: '1', minWidth: '250px', backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ color: '#ccc', margin: '0 0 15px 0', alignSelf: 'flex-start' }}>СИГНАТУРКА</h3>
            <img 
              src={`${STEAM_CDN}${mostPlayedHeroInfo.img}`} 
              alt={mostPlayedHeroInfo.localized_name} 
              style={{ width: '120px', borderRadius: '4px', border: '2px solid #dc3545', marginBottom: '10px' }} 
            />
            <strong style={{ color: '#fff', fontSize: '18px' }}>{mostPlayedHeroInfo.localized_name}</strong>
            <span style={{ color: '#888', fontSize: '14px', marginTop: '5px' }}>
              Матчів: {mostPlayedHeroData.games} • Winrate: {((mostPlayedHeroData.wins / mostPlayedHeroData.games) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #333', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            onClick={() => setActiveTab('matches')}
            style={{ 
              padding: '10px 20px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
              color: activeTab === 'matches' ? '#dc3545' : '#888',
              borderBottom: activeTab === 'matches' ? '3px solid #dc3545' : '3px solid transparent'
            }}
          >
            ОСТАННІ МАТЧІ
          </button>
          <button 
            onClick={() => setActiveTab('heroes')}
            style={{ 
              padding: '10px 20px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
              color: activeTab === 'heroes' ? '#dc3545' : '#888',
              borderBottom: activeTab === 'heroes' ? '3px solid #dc3545' : '3px solid transparent'
            }}
          >
            ГЕРОЇ
          </button>
        </div>

        <button 
          onClick={() => setExcludeTurbo(!excludeTurbo)}
          style={{
            marginBottom: '10px',
            backgroundColor: excludeTurbo ? '#dc3545' : 'transparent',
            color: excludeTurbo ? '#fff' : '#ccc',
            border: `1px solid ${excludeTurbo ? '#dc3545' : '#555'}`,
            padding: '6px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {excludeTurbo ? 'БЕЗ ТУРБО (УВІМКНЕНО)' : 'ПОКАЗУВАТИ ТУРБО'}
        </button>
      </div>

      {activeTab === 'heroes' && (
        <div className="fade-in" style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #333' }}>
                <th style={{ padding: '10px' }}>Герой</th>
                <th style={{ padding: '10px' }}>Матчів</th>
                <th style={{ padding: '10px' }}>Перемог</th>
                <th style={{ padding: '10px' }}>Поразок</th>
                <th style={{ padding: '10px' }}>Вінрейт</th>
              </tr>
            </thead>
            <tbody>
              {allHeroesStats.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '20px', color: '#888', textAlign: 'center' }}>Немає даних з поточними фільтрами</td></tr>
              ) : null}
              {allHeroesStats.map((th, index) => {
                const hInfo = heroes[th.id];
                const wr = ((th.wins / th.games) * 100).toFixed(1);
                if (!hInfo) return null;

                return (
                  <tr key={index} style={{ borderBottom: '1px solid #2a2a2a', transition: 'background-color 0.2s' }} className="hero-row-hover">
                    <td style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <img src={`${STEAM_CDN}${hInfo.img}`} alt="hero" style={{ width: '50px', borderRadius: '4px' }} />
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{hInfo.localized_name}</span>
                    </td>
                    <td style={{ padding: '10px', color: '#ccc', fontWeight: 'bold' }}>{th.games}</td>
                    <td style={{ padding: '10px', color: '#28a745' }}>{th.wins}</td>
                    <td style={{ padding: '10px', color: '#dc3545' }}>{th.losses}</td>
                    <td style={{ padding: '10px', color: wr >= 50 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>{wr}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="pro-matches-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {recentMatches.length === 0 ? <p style={{color: '#888'}}>Немає публічних матчів за вибраними фільтрами.</p> : null}
          
          {recentMatches.map((m, idx) => {
            const isWin = (m.player_slot < 128 && m.radiant_win) || (m.player_slot >= 128 && !m.radiant_win);
            const hero = heroes[m.hero_id] || {};

            const lobbyStr = String(m.lobby_type).toUpperCase();
            const gmStr = String(m.game_mode).toUpperCase();
            const gmNum = Number(m.game_mode);

            const isRanked = m.lobby_type === 7 || (lobbyStr.includes('RANKED') && !lobbyStr.includes('UNRANKED'));
            const isTurbo = gmNum === 23 || gmStr.includes('TURBO');
            const matchTypeLabel = isRanked ? "ММ" : (isTurbo ? "Турбо" : "Без ММ");
            
            return (
              <div key={idx} className="match-card-pro" style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '10px 20px', backgroundColor: '#1a1a1a', borderRadius: '6px',
                  borderLeft: `4px solid ${isWin ? '#28a745' : '#dc3545'}`,
                  borderRight: '1px solid #333', borderTop: '1px solid #333', borderBottom: '1px solid #333'
              }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '1' }}>
                  <img 
                    src={hero.img ? `${STEAM_CDN}${hero.img}` : ''} 
                    alt="Hero" 
                    style={{ width: '60px', borderRadius: '4px' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <div className="match-id-box">
                    <span className="league-name" style={{ color: '#fff', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                      {hero.localized_name || 'Unknown Hero'}
                    </span>
                    <span className="sub-label" style={{ fontSize: '12px', color: '#888' }}>
                      {m.kills} / {m.deaths} / {m.assists} • <strong style={{ color: isTurbo ? '#f39c12' : '#888' }}>{matchTypeLabel}</strong>
                    </span>
                  </div>
                </div>

                <div className="match-meta-info" style={{ flex: '1', textAlign: 'center' }}>
                  <div style={{ color: isWin ? '#28a745' : '#dc3545', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                    ПІДСУМОК: {isWin ? "ПЕРЕМОГА" : "ПОРАЗКА"}
                  </div>
                  <div style={{ color: '#888', fontSize: '12px' }}>
                    {(m.duration / 60).toFixed(0)} ХВ
                  </div>
                </div>

                <div className="action-box" style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px' }}>MATCH ID</span>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>{m.match_id}</span>
                  </div>
                  <Link to={`/match/${m.match_id}`} className="btn-analyze" style={{
                      backgroundColor: '#dc3545', color: '#fff', textDecoration: 'none',
                      padding: '8px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
                  }}>
                    АНАЛІЗ БІЛДУ
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default PlayerProfile;