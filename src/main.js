import { Game } from './game/Game.js';
import { UI } from './ui/UI.js';
import { applyTheme } from './game/Themes.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  const ui = new UI(game);

  applyTheme(game.themeId);

  game._looping = true;
  requestAnimationFrame(game.loop);
  
  // Mostrar home ao invés de menu
  ui.showScreen('home');

  if (import.meta.env.DEV) {
    window.__game = game;
    window.__ui = ui;
  }
});