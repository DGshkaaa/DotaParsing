import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Remove browser tooltips from navbar
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
