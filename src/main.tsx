import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { applyTheme, syncMusic } from './themes';
import { getSettings, subscribeSettings } from './lib/settings';
import { fx } from './fx/engine';
import './styles/game.css';

// Paint the saved theme before the first render, and follow later changes.
let last = getSettings();
fx.setQuality(last.fx);
applyTheme(last.theme);
subscribeSettings(() => {
  const s = getSettings();
  if (s.theme !== last.theme) applyTheme(s.theme);
  else if (s.track !== last.track) syncMusic();
  if (s.fx !== last.fx) fx.setQuality(s.fx);
  last = s;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
