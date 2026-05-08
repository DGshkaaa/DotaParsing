import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Remove browser tooltips from navbar and heroes table
const removeTooltips = () => {
  setTimeout(() => {
    // Remove from navbar
    document.querySelectorAll('.navbar [title]').forEach(el => el.removeAttribute('title'));
    // Remove ALL title attributes from heroes table
    document.querySelectorAll('.heroes-table *').forEach(el => {
      el.removeAttribute('title');
      el.setAttribute('title', '');
    });
  }, 50);
};
removeTooltips();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

setTimeout(removeTooltips, 200);
setTimeout(removeTooltips, 500);
// Also clean up tooltips periodically for dynamically added elements
setInterval(removeTooltips, 1000);
