import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPanel.css';

function AdminPanel() {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: ''
  });

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    verifyAdmin();
  }, [token, navigate]);

  const verifyAdmin = async () => {
    try {
      // Перевіряємо локальний статус адміна
      const isAdminLocal = localStorage.getItem('is_admin') === 'true';
      
      if (!isAdminLocal) {
        setMessage({ type: 'error', text: 'Доступ заборонений. Тільки адміністратор.' });
        setTimeout(() => navigate('/'), 2000);
      } else {
        setIsAdmin(true);
        fetchNews();
      }
    } catch (err) {
      console.error('Помилка перевірки адміна:', err);
      setMessage({ type: 'error', text: 'Помилка авторизації' });
      setTimeout(() => navigate('/'), 2000);
    }
    setLoading(false);
  };

  const fetchNews = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await axios.get(`${apiUrl}/news/`);
      setNews(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Помилка завантаження новин:', err);
      setLoading(false);
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setMessage({ type: 'error', text: 'Заповніть усі обов\'язкові поля' });
      return;
    }
    
    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      if (editingId) {
        await axios.put(`${apiUrl}/news/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage({ type: 'success', text: 'Новину оновлено!' });
      } else {
        await axios.post(`${apiUrl}/news/`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage({ type: 'success', text: 'Новину додано!' });
      }
      setFormData({ title: '', content: '', image_url: '' });
      setEditingId(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      fetchNews();
    } catch (err) {
      console.error('Помилка:', err);
      const errorMsg = err.response?.data?.detail || 'Помилка операції';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      image_url: item.image_url || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Видалити цю новину? Це дійство неможливо скасувати.')) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      await axios.delete(`${apiUrl}/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Новину видалено!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      fetchNews();
    } catch (err) {
      console.error('Помилка видалення:', err);
      const errorMsg = err.response?.data?.detail || 'Помилка видалення';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', image_url: '' });
  };

  if (loading) {
    return <div className="admin-loading">Завантаження...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h1>❌ Доступ заборонений</h1>
          <p>Тільки адміністратор має доступ до цієї сторінки.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h1>Адмін Панель - Управління Новинами</h1>
      
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="admin-container">
        {/* Форма */}
        <div className="admin-form-section">
          <h2>{editingId ? 'Редагування новини' : 'Додати нову новину'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <input
              type="text"
              name="title"
              placeholder="Заголовок"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="form-input"
            />
            <textarea
              name="content"
              placeholder="Вміст"
              value={formData.content}
              onChange={handleInputChange}
              required
              className="form-textarea"
              rows="6"
            />
            <input
              type="url"
              name="image_url"
              placeholder="URL зображення"
              value={formData.image_url}
              onChange={handleInputChange}
              className="form-input"
            />
            <div className="form-buttons">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Збереження...' : editingId ? 'Зберегти' : 'Додати'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="btn-secondary" disabled={submitting}>
                  Скасувати
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Список новин */}
        <div className="admin-news-section">
          <h2>Список новин ({news.length})</h2>
          <div className="news-list">
            {news.length === 0 ? (
              <p className="no-news">Новин немає</p>
            ) : (
              news.map(item => (
                <div key={item.id} className="news-item">
                  <div className="news-header">
                    <h3>{item.title}</h3>
                    <span className="news-date">
                      {new Date(item.created_at).toLocaleDateString('uk-UA')}
                    </span>
                  </div>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.title} className="news-thumbnail" />
                  )}
                  <p className="news-content">{item.content.substring(0, 150)}...</p>
                  <div className="news-actions">
                    <button
                      onClick={() => handleEdit(item)}
                      className="btn-edit"
                    >
                      ✏️ Редагувати
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn-delete"
                    >
                      🗑️ Видалити
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
