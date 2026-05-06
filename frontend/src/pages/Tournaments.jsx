import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './Tournaments.css';
import { Link } from 'react-router-dom';

// ============ УТИЛІТИ ============
const formatPrizeMoney = (amount) => {
  if (!amount || amount === 0 || amount === '0' || amount === 'TBA') {
    return 'TBA';
  }
  
  if (typeof amount === 'string') {
    const num = parseInt(amount.replace(/\D/g, ''));
    if (isNaN(num)) return amount;
    amount = num;
  }

  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
};

const formatWinnerDisplay = (winner, isCompleted = false) => {
  if (!winner || winner === 'TBA' || winner === 'Результат відсутній') {
    if (isCompleted) {
      return '📊 Інформація недоступна';
    }
    return '⏳ Очікування результату';
  }
  if (winner.includes('Матч в процесі')) {
    return '🔴 Матч в процесі';
  }
  return winner;
};

const getSteamAvatarUrl = (steamId, size = 'full') => {
  if (!steamId || steamId === '0' || steamId === 0) return null;
  const sizeMapping = { full: '_full', medium: '_medium', small: '' };
  try {
    if (steamId.toString().length > 10) {
      return `https://avatars.steamstatic.com/${steamId}${sizeMapping[size]}.jpg`;
    }
    const steamId32 = parseInt(steamId);
    if (isNaN(steamId32) || steamId32 <= 0) return null;
    const steamId64 = (steamId32 + 76561197960265728).toString();
    return `https://avatars.steamstatic.com/${steamId64}${sizeMapping[size]}.jpg`;
  } catch (e) {
    return null;
  }
};

const DEFAULT_PLAYER_AVATAR = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';
const DEFAULT_TOURNAMENT_IMAGE = 'https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/blog/ti12_winner/ti12_winner_header.jpg';

// НАДІЙНІ КАРТИНКИ (Без блокування CORS)
const FALLBACK_IMAGES = [
  'https://i.pinimg.com/1200x/f5/40/52/f54052b459fb07e12cdd4075883f5db2.jpg',
  'https://i.pinimg.com/1200x/e0/be/72/e0be72d15a8c531463c9f2d7db8115ca.jpg',
  'https://i.pinimg.com/1200x/32/71/1a/32711afc28f5b187f902415b761c79fc.jpg',
  'https://i.pinimg.com/1200x/07/38/00/073800847a719c63b2b8ab5618903efa.jpg'
];

const getFallbackImage = (id) => {
  if (!id) return FALLBACK_IMAGES[0];
  const numId = typeof id === 'number' ? id : parseInt(id.toString().replace(/\D/g, '')) || 0;
  const index = Math.abs(numId) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[index];
};

const getImageUrl = (imageUrl, fallbackId) => {
  return (imageUrl && imageUrl.trim() == '2') ? imageUrl : getFallbackImage(fallbackId);
};

const SkeletonLoader = ({ count = 3, type = 'card' }) => {
  return Array.from({ length: count }).map((_, idx) => (
    <div key={idx} className={`skeleton skeleton-${type}`}>
      <div className="skeleton-pulse"></div>
    </div>
  ));
};

function Tournaments() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [searchTeam, setSearchTeam] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const handleImageError = (e, matchId) => {
    const fallback = getFallbackImage(matchId);
    if (e.target.src !== fallback) {
      e.target.src = fallback;
    }
  };

  useEffect(() => {
    fetchTournamentsData();
  }, []);

 const fetchTournamentsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Отримуємо базовий URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

      // Використовуємо apiUrl замість жорсткого 127.0.0.1
      const [upcomingRes, recentRes, teamsRes, matchesRes] = await Promise.all([
        axios.get(`${apiUrl}/tournaments/upcoming`),
        axios.get(`${apiUrl}/tournaments/recent`),
        axios.get(`${apiUrl}/tournaments/teams`),
        axios.get(`${apiUrl}/tournaments/matches`)
      ]);

      setUpcomingTournaments(upcomingRes.data);
      setRecentTournaments(recentRes.data);
      setTeams(teamsRes.data);
      setMatches(matchesRes.data);
    } catch (err) {

      console.error('Помилка завантаження турнірів:', err);
      setError('Не вдалось завантажити дані про турніри');
    } finally {
      setLoading(false);
    }
  };

  // ============ ФІЛЬТРАЦІЯ ЧЕРЕЗ USEMEMO ============
  const uniqueRegions = useMemo(() => {
    const regions = new Set(
      teams
        .map(t => t.region)
        .filter(r => r && r !== 'world' && r !== 'World' && r !== '')
    );
    return Array.from(regions).sort().length > 0 ? Array.from(regions).sort() : ['N/A'];
  }, [teams]);

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesSearch = team.name.toLowerCase().includes(searchTeam.toLowerCase());
      const matchesRegion = selectedRegion === 'all' || 
                           team.region === selectedRegion ||
                           (selectedRegion !== 'all' && (!team.region || team.region === 'world' || team.region === 'World'));
      return matchesSearch && matchesRegion;
    });
  }, [teams, searchTeam, selectedRegion]);

  const filteredMatches = useMemo(() => {
    return matches.map(match => ({
      ...match,
      isLive: match.status && match.status.toLowerCase() === 'live'
    }));
  }, [matches]);

  const closeTournamentModal = () => {
    setSelectedTournament(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeTournamentModal();
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeTournamentModal();
      }
    };
    
    if (selectedTournament) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [selectedTournament]);

  const handleSteamAvatarError = (e) => {
    // Одразу замінити на default
    if (e.target.src !== DEFAULT_PLAYER_AVATAR) {
      e.target.src = DEFAULT_PLAYER_AVATAR;
      e.target.onerror = null; // Забезпечити, щоб не було infinite loop
    }
  };

  return (
    <div className="tournaments-page">
      <div className="tournaments-header">
        <h1> ТУРНІРИ DOTA 2</h1>
        <p className="tournaments-subtitle">Найкращі команди світу змагаються за велику приз-пулу</p>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Завантаження даних про турніри...</p>
          <div className="tournaments-grid">
            <SkeletonLoader count={4} type="card" />
          </div>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchTournamentsData} className="retry-btn">Спробувати ще раз</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ВКЛАДКИ З GLASSMORPHISM */}
          <div className="tournaments-tabs">
            <button 
              className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
               Найближчі турніри
            </button>
            <button 
              className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
               Завершені турніри
            </button>
            <button 
              className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
               Матчі
            </button>
          </div>

          {/* ВМІСТУ ВКЛАДОК */}
          <div className="tab-content">

            {/* НАЙБЛИЖЧІ ТУРНІРИ */}
            {activeTab === 'upcoming' && (
              <div className="tournaments-grid">
                {upcomingTournaments.map(tournament => (
                  <div key={tournament.id} className="tournament-card glass-morphism gradient-border">
                    <img 
                      src={getImageUrl(tournament.image, tournament.id)}
                      alt={tournament.name} 
                      className="tournament-image"
                      onError={(e) => handleImageError(e, tournament.id)}
                    />
                    <div className="tournament-info">
                      <h3>{tournament.name}</h3>
                      <div className="tournament-details">
                        <p>📅 <strong>{new Date(tournament.date).toLocaleDateString('uk-UA')}</strong></p>
                        <p>📍 {tournament.location}</p>
                        <p>💰 Приз пул: <strong>{formatPrizeMoney(tournament.prize_pool)}</strong></p>
                        <p>🏆 Команд: <strong>{tournament.teams_count}</strong></p>
                      </div>
                      <button className="tournament-btn" onClick={() => setSelectedTournament(tournament)}>Деталі</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ЗАВЕРШЕНІ ТУРНІРИ */}
            {activeTab === 'recent' && (
              <div className="recent-tournaments">
                {recentTournaments.map(tournament => (
                  <div key={tournament.id} className="recent-card glass-morphism gradient-border">
                    <div className="recent-left">
                      <h3>{tournament.name}</h3>
                      <p className="tournament-date">📅 {new Date(tournament.date).toLocaleDateString('uk-UA')}</p>
                    </div>
                    <div className="recent-center">
                      <p className="winner-label">🏆 Переможець</p>
                      <p className="winner-name">{formatWinnerDisplay(tournament.winner, true)}</p>
                    </div>
                    <div className="recent-right">
                      <p className="prize-label">Призовий фонд</p>
                      <p className="prize">{formatPrizeMoney(tournament.prize_pool)}</p>
                      <p className="teams-count">{tournament.teams_count} команд</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* МАТЧИ З LIVE-ІНДИКАТОРОМ */}
            {activeTab === 'matches' && (
              <div className="matches-container">
                {filteredMatches.map(match => (
                  <div key={match.id} className={`match-card glass-morphism gradient-border ${match.isLive ? 'live' : ''}`}>
                    {match.isLive && (
                      <div className="live-indicator">
                        <span className="live-pulse"></span>
                        LIVE
                      </div>
                    )}
                    <div className="match-image-placeholder">
                      <img 
                        src={getImageUrl(match.image, match.id)}
                        alt={`${match.team1} vs ${match.team2}`}
                        className="match-image"
                        onError={(e) => handleImageError(e, match.id)}
                      />
                    </div>
                    <div className="match-tournament">{match.tournament}</div>
                    <div className="match-content">
                      <div className="match-team team-left">{match.team1}</div>
                      <div className="match-vs">VS</div>
                      <div className="match-team team-right">{match.team2}</div>
                    </div>
                    <div className="match-footer">
                      <p>📅 {new Date(match.datetime).toLocaleDateString('uk-UA')} о {new Date(match.datetime).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</p>
                      <span className={`status ${match.status ? match.status.toLowerCase() : 'upcoming'}`}>{match.bo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </>
      )}

      {/* МОДАЛЬНЕ ВІКНО ТУРНІРУ З GLASSMORPHISM */}
      {selectedTournament && (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
          <div className="modal-content tournament-modal glass-morphism gradient-border">
            <div className="modal-header">
              <h2>{selectedTournament.name}</h2>
              <button 
                className="modal-close-btn" 
                onClick={closeTournamentModal}
                title="Закрити (Esc)"
              >
                ✕
              </button>
            </div>

            {selectedTournament.image && (
              <div className="modal-image">
                <img 
                  src={getImageUrl(selectedTournament.image, selectedTournament.id)} 
                  alt={selectedTournament.name}
                  onError={(e) => handleImageError(e, selectedTournament.id)}
                />
              </div>
            )}

            <div className="modal-body">
              <div className="tournament-details-modal">
                <div className="detail-row">
                  <span className="detail-label">📅 Дата:</span>
                  <span className="detail-value">{new Date(selectedTournament.date).toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">📍 Місце:</span>
                  <span className="detail-value">{selectedTournament.location || 'Online'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">💰 Приз-пул:</span>
                  <span className="detail-value highlight">{formatPrizeMoney(selectedTournament.prize_pool)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏆 Команд:</span>
                  <span className="detail-value">{selectedTournament.teams_count || selectedTournament.teams}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🎮 Формат:</span>
                  <span className="detail-value">Bo3 / Group Stage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tournaments;