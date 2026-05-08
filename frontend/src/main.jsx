import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Убрати браузерні tooltips з навігації
const removeNavbarTooltips = () => {
  setTimeout(() => {
    document.querySelectorAll('.navbar [title]').forEach(el => el.removeAttribute('title'));
  }, 50);
};
removeNavbarTooltips();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

setTimeout(removeNavbarTooltips, 200);
