import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';


function MatchDetails() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [heroes, setHeroes] = useState({});
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showItems, setShowItems] = useState(false);

  const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
  
  const getHeroImageUrl = (hero) => {
    if (!hero || !hero.img) return 'https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png';
    return `${STEAM_CDN}${hero.img}`;
  };
  
  const getItemImageUrl = (item) => {
    if (!item || !item.img) return 'https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png';
    return `${STEAM_CDN}${item.img}`;
  };

  useEffect(() => {
    const fetchFullMatchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

        // Завантажуємо героїв
        const heroesRes = await axios.get(`${apiUrl}/heroes`);
        const mappedHeroes = {};
        if (Array.isArray(heroesRes.data)) {
          heroesRes.data.forEach(h => {
            if (h && h.id) mappedHeroes[h.id] = h;
          });
        } else {
          Object.values(heroesRes.data).forEach(h => {
            if (h && h.id) mappedHeroes[h.id] = h;
          });
        }
        setHeroes(mappedHeroes);
        console.log('[MatchDetails] Героїв завантажено:', Object.keys(mappedHeroes).length);

        // Завантажуємо предмети
        const itemsRes = await axios.get(`${apiUrl}/items`);
        const mappedItems = {};
        if (Array.isArray(itemsRes.data)) {
          itemsRes.data.forEach(item => {
            if (item && item.id) mappedItems[item.id] = item;
          });
        } else {
          Object.values(itemsRes.data).forEach(item => {
            if (item && item.id) mappedItems[item.id] = item;
          });
        }
        setItems(mappedItems);
        console.log('[MatchDetails] Предметів завантажено:', Object.keys(mappedItems).length);

        // Завантажуємо матч
        const matchRes = await axios.get(`${apiUrl}/matches/${matchId}`);
        console.log('[MatchDetails] Матч завантажено:', matchRes.data);
        setMatch(matchRes.data);
        setCurrentTime(Math.floor(matchRes.data.duration / 60));
        setLoading(false);
      } catch (err) {
        console.error("Помилка аналізу матчу:", err);
        setLoading(false);
      }
    };
    fetchFullMatchData();
  }, [matchId]);

  const getKDAAtTime = (player, minute) => {
    if (player.killsT && player.deathsT && player.assistsT && minute < player.killsT.length) {
      return { kills: player.killsT[minute], deaths: player.deathsT[minute], assists: player.assistsT[minute] };
    }
    return { kills: player.kills || 0, deaths: player.deaths || 0, assists: player.assists || 0 };
  };

  const getGoldAtTime = (player, minute) => {
    if (player.goldT && Array.isArray(player.goldT) && minute < player.goldT.length) {
        return player.goldT[minute];
    }
    return player.net_worth || player.gold || 0;
  };

  const getGoldAdvantage = (minute) => {
    if (!match || !match.players) return 0;
    const radiantGold = match.players.slice(0, 5).reduce((sum, p) => sum + getGoldAtTime(p, minute), 0);
    const direGold = match.players.slice(5, 10).reduce((sum, p) => sum + getGoldAtTime(p, minute), 0);
    return radiantGold - direGold;
  };

  const getWinProbability = (minute) => {
    if (!match || minute === 0) return 50;
    const goldAdv = getGoldAdvantage(minute);
    const goldFactor = (goldAdv / 50000) * 30;
    const baseProbability = 50 + goldFactor;
    return Math.max(5, Math.min(95, baseProbability.toFixed(1)));
  };

  const getDynamicScore = (minute) => {
    if (!match || !match.players) return { radiant: match.radiant_score || 0, dire: match.dire_score || 0 };
    if (match.players[0] && match.players[0].killsT && match.players[0].killsT.length > minute) {
       const radiantKills = match.players.slice(0, 5).reduce((sum, p) => sum + (p.killsT[minute] || 0), 0);
       const direKills = match.players.slice(5, 10).reduce((sum, p) => sum + (p.killsT[minute] || 0), 0);
       return { radiant: radiantKills, dire: direKills };
    }
    return { radiant: match.radiant_score || 0, dire: match.dire_score || 0 };
  };

  // НОВА ФУНКЦІЯ: Сортування предметів за часом покупки
  const getSortedItems = (player) => {
    const rawItems = player.final_items || [];
    // Забираємо пусті слоти
    const validItems = rawItems.filter(item => item !== null && item > 0);
    
    // Сортуємо
    validItems.sort((a, b) => {
      const timeA = player.purchase_time && player.purchase_time[a] !== undefined ? player.purchase_time[a] : 999;
      const timeB = player.purchase_time && player.purchase_time[b] !== undefined ? player.purchase_time[b] : 999;
      return timeA - timeB;
    });

    // Добиваємо масив до 6 слотів
    const sorted = [...validItems];
    while (sorted.length < 6) {
      sorted.push(null);
    }
    return sorted;
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
      <p>ПАРСИНГ РЕПЛЕЮ...</p>
    </div>
  );

  if (!match) return (
    <div className="main-content fade-in" style={{textAlign: 'center', marginTop: '100px'}}>
      <h2>Помилка завантаження</h2>
      <p style={{color: '#ff4d4d'}}>Матч не знайдено або API тимчасово недоступне.</p>
    </div>
  );

  const dynamicScore = getDynamicScore(currentTime);
  const goldAdv = getGoldAdvantage(currentTime);
  const advTeam = goldAdv > 0 ? "RADIANT" : (goldAdv < 0 ? "DIRE" : "");
  const absAdv = Math.abs(goldAdv).toLocaleString();

  const winProbRadiant = getWinProbability(currentTime);
  const probTeam = winProbRadiant >= 50 ? "RADIANT" : "DIRE";
  const probValue = winProbRadiant >= 50 ? winProbRadiant : (100 - winProbRadiant).toFixed(1);

  return (
    <div className="main-content fade-in">
      <div className="match-detail-top">
        <div className="team-score radiant">
          <span className="score-num">{dynamicScore.radiant}</span>
          <span className="team-side">RADIANT</span>
        </div>
        <div className="match-center-info">
          <div className={`winner-banner ${match.radiant_win ? 'rad' : 'dire'}`}>
            {match.radiant_win ? "RADIANT VICTORY" : "DIRE VICTORY"}
          </div>
          <div className="match-sub-meta">
            ID: {matchId} • {(match.duration / 60).toFixed(0)}:{(match.duration % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <div className="team-score dire">
          <span className="team-side">DIRE</span>
          <span className="score-num">{dynamicScore.dire}</span>
        </div>
      </div>

      <div className="timeline-analyzer">
        <div className="timeline-header">
          <span>ХВИЛИНА: <strong className="text-red">{currentTime}</strong></span>
          <span className={`gold-adv ${goldAdv > 0 ? 'text-win' : (goldAdv < 0 ? 'text-loss' : '')}`}>
            ПЕРЕВАГА {advTeam}: {absAdv} Г
          </span>
          <span className={`win-prob ${winProbRadiant >= 50 ? 'text-win' : 'text-loss'}`}>
            ЙМОВІРНІСТЬ {probTeam}: {probValue}%
          </span>
        </div>
        <input 
          type="range" min="0" max={Math.floor(match.duration / 60)} 
          value={currentTime} onChange={(e) => setCurrentTime(parseInt(e.target.value))}
          className="strat-slider"
        />
      </div>

      <div className="detail-tabs">
        <button className={`tab-btn ${!showItems ? 'active' : ''}`} onClick={() => setShowItems(false)}>
           ЗОЛОТО & УБИВСТВА
        </button>
        <button className={`tab-btn ${showItems ? 'active' : ''}`} onClick={() => setShowItems(true)}>
           ПРЕДМЕТИ (хв. {currentTime})
        </button>
      </div>

      {!showItems && (
        <div className="match-players-grid">
          <div className="team-table radiant-table">
            <h4 className="table-title">THE RADIANT</h4>
            {match.players.slice(0, 5).map((p, i) => {
              const heroId = p.heroId || p.hero_id;
              const hero = heroes[heroId] || { id: heroId };
              const gold = getGoldAtTime(p, currentTime);
              const kda = getKDAAtTime(p, currentTime);
              return (
                <div key={i} className="p-row-detail">
                  <img src={getHeroImageUrl(hero)} className="p-hero-icon" alt="Hero" onError={(e) => e.target.style.display = 'none'} />
                  <div className="p-main-info">
                    <span className="p-name">Player {i + 1}</span>
                    <div className="gold-progress-bg">
                      <div className="gold-progress-fill" style={{ width: `${Math.min(100, (gold / 35000) * 100)}%` }}>
                        <span className="gold-val">{gold.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-kda-mini">{kda.kills}/{kda.deaths}/{kda.assists}</div>
                </div>
              );
            })}
          </div>

          <div className="team-table dire-table">
            <h4 className="table-title">THE DIRE</h4>
            {match.players.slice(5, 10).map((p, i) => {
              const heroId = p.heroId || p.hero_id;
              const hero = heroes[heroId] || { id: heroId };
              const gold = getGoldAtTime(p, currentTime);
              const kda = getKDAAtTime(p, currentTime);
              return (
                <div key={i} className="p-row-detail">
                  <img src={getHeroImageUrl(hero)} className="p-hero-icon" alt="Hero" onError={(e) => e.target.style.display = 'none'} />
                  <div className="p-main-info">
                    <span className="p-name">Player {i + 6}</span>
                    <div className="gold-progress-bg">
                      <div className="gold-progress-fill dire-gold" style={{ width: `${Math.min(100, (gold / 35000) * 100)}%` }}>
                        <span className="gold-val">{gold.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-kda-mini">{kda.kills}/{kda.deaths}/{kda.assists}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showItems && (
        <div className="items-timeline">
          <h4 className="items-title">БІЛДИ НА ХВИЛИНУ {currentTime}</h4>
          <div className="items-grid">
            <div className="team-items radiant-items">
              <h5>RADIANT BUILDUP</h5>
              {match.players.slice(0, 5).map((p, i) => {
                const heroId = p.heroId || p.hero_id;
                const hero = heroes[heroId] || { id: heroId };
                
                // Використовуємо нову функцію сортування
                const itemsToRender = getSortedItems(p);

                return (
                  <div key={i} className="player-items">
                    <img src={getHeroImageUrl(hero)} alt="Hero" className="item-hero-icon" onError={(e) => e.target.style.display = 'none'} />
                    <div className="items-row">
                      {itemsToRender.map((itemId, idx) => {
                        if (!itemId) return <div key={idx} className="item-slot"><span>—</span></div>;
                        const item = items[itemId];
                        const pTime = p.purchase_time ? p.purchase_time[itemId] : 0;
                        const isBought = currentTime >= (pTime || 0);

                        return (
                          <div key={idx} className="item-slot" title={item?.name || `Item ID: ${itemId}`}>
                            {item ? (
                              <img 
                                src={getItemImageUrl(item)} alt={item?.name} 
                                style={{
                                  width: '100%', height: '100%',
                                  filter: isBought ? 'none' : 'grayscale(100%)',
                                  opacity: isBought ? 1 : 0.5,
                                  transition: 'all 0.3s'
                                }} 
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png'; }}
                              />
                            ) : <span style={{fontSize: '10px', color: 'gray'}}>ID {itemId}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="team-items dire-items">
              <h5>DIRE BUILDUP</h5>
              {match.players.slice(5, 10).map((p, i) => {
                const heroId = p.heroId || p.hero_id;
                const hero = heroes[heroId] || { id: heroId };
                
                // Використовуємо нову функцію сортування
                const itemsToRender = getSortedItems(p);

                return (
                  <div key={i} className="player-items">
                    <img src={getHeroImageUrl(hero)} alt="Hero" className="item-hero-icon" onError={(e) => e.target.style.display = 'none'} />
                    <div className="items-row">
                      {itemsToRender.map((itemId, idx) => {
                        if (!itemId) return <div key={idx} className="item-slot"><span>—</span></div>;
                        const item = items[itemId];
                        const pTime = p.purchase_time ? p.purchase_time[itemId] : 0;
                        const isBought = currentTime >= (pTime || 0);

                        return (
                          <div key={idx} className="item-slot" title={item?.name || `Item ID: ${itemId}`}>
                            {item ? (
                              <img 
                                src={getItemImageUrl(item)} alt={item?.name} 
                                style={{
                                  width: '100%', height: '100%',
                                  filter: isBought ? 'none' : 'grayscale(100%)',
                                  opacity: isBought ? 1 : 0.5,
                                  transition: 'all 0.3s'
                                }} 
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://community.cloudflare.steamstatic.com/public/images/economy/applcns/570/item_bg.png'; }}
                              />
                            ) : <span style={{fontSize: '10px', color: 'gray'}}>ID {itemId}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchDetails;