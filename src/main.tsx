import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { applyTheme, syncMusic } from './themes';
import { getSettings, isPreviewing, subscribeSettings } from './lib/settings';
import { fx } from './fx/engine';
import './styles/game.css';

// Paint the saved theme before the first render, and follow later changes
// (your own picks, a room's theme, or a preview in the theme gallery).
let last = getSettings();
let previewing = false;
fx.setQuality(last.fx);
applyTheme(last.theme);
subscribeSettings(() => {
  const s = getSettings();
  const wasPreviewing = previewing;
  previewing = isPreviewing();
  if (s.theme !== last.theme) applyTheme(s.theme, { music: !previewing });
  else if (s.track !== last.track || (wasPreviewing && !previewing)) syncMusic();
  if (s.fx !== last.fx) fx.setQuality(s.fx);
  last = s;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
