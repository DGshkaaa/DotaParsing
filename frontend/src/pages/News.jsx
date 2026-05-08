import { useState, useEffect } from 'react';
import axios from 'axios';
import './News.css';

function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await axios.get(`${apiUrl}/news/`, {
        params: { limit: 50, skip: 0 }
      });
      setNews(response.data);
      setError(null);
    } catch (err) {
      console.error('Помилка завантаження новин:', err);
      setError('Не вдалось завантажити новини');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedNews(null);
  };

  // Закриття при кліку на фон
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  // Закриття при натисканні Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    
    if (selectedNews) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [selectedNews]);

  if (loading) {
    return <div className="news-page"><div className="loading">Завантаження новин...</div></div>;
  }

  return (
    <div className="news-page">
      <div className="news-container">
        <h1>Новини Dota 2</h1>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {news.length === 0 ? (
          <div className="no-news">
            <p>Новин немає</p>
          </div>
        ) : (
          <div className="news-grid">
            {news.map((item) => (
              <div key={item.id} className="news-card">
                {item.image_url && (
                  <div className="news-image">
                    <img src={item.image_url} alt={item.title} />
                  </div>
                )}
                
                <div className="news-content">
                  <div className="news-header">
                    <h2>{item.title}</h2>
                    <span className="news-date">
                      {new Date(item.created_at).toLocaleDateString('uk-UA', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <p className="news-text">
                    {item.content.substring(0, 200) + (item.content.length > 200 ? '...' : '')}
                  </p>

                  {item.content.length > 200 && (
                    <button 
                      className="read-more-btn"
                      onClick={() => setSelectedNews(item)}
                    >
                      Читати далі
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* МОДАЛЬНЕ ВІКНО */}
      {selectedNews && (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedNews.title}</h2>
              <button 
                className="modal-close-btn" 
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            {selectedNews.image_url && (
              <div className="modal-image">
                <img src={selectedNews.image_url} alt={selectedNews.title} />
              </div>
            )}

            <div className="modal-body">
              <div className="modal-date">
                📅 {new Date(selectedNews.created_at).toLocaleDateString('uk-UA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <p className="modal-text">{selectedNews.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default News;
