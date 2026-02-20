import { THEMES, THEME_ORDER, applyTheme } from '../game/Themes.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.currentScreen = 'home';
    
    this.buildThemeSelector();
    this.setupHomeListeners();
    this.setupSettingsListeners();
    this.setupGameListeners();
    this.loadSettings();
    this.updateHighscoreDisplay();
  }

  buildThemeSelector() {
    const container = document.getElementById('theme-selector');
    container.innerHTML = '';

    THEME_ORDER.forEach(id => {
      const theme = THEMES[id];
      const btn = document.createElement('button');
      btn.className = 'theme-chip' + (id === 'midnight' ? ' active' : '');
      btn.dataset.theme = id;
      btn.title = theme.name;
      btn.innerHTML = `
        <span class="theme-chip-preview">
          <span class="tcp-bg" style="background:${theme.bgSecondary}"></span>
          <span class="tcp-snake" style="background:${theme.snakeBody}"></span>
          <span class="tcp-food" style="background:${theme.foodPrimary}"></span>
        </span>
        <span class="theme-chip-label">${theme.name}</span>
      `;
      container.appendChild(btn);
    });
  }

  setupHomeListeners() {
    // Play button
    document.getElementById('play-btn').addEventListener('click', () => {
      this.applySettings();
      this.game.start();
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showScreen('settings');
    });
  }

  setupSettingsListeners() {
    // Back button
    document.getElementById('settings-back-btn').addEventListener('click', () => {
      this.showScreen('home');
    });

    // Theme selector
    document.getElementById('theme-selector').addEventListener('click', (e) => {
      const chip = e.target.closest('.theme-chip');
      if (!chip) return;
      document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const themeId = chip.dataset.theme;
      this.game.setTheme(themeId);
      applyTheme(themeId);
      this.saveSettings();
    });

    // Speed buttons
    document.querySelectorAll('.opt-btn[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.saveSettings();
      });
    });

    // Grid buttons
    document.querySelectorAll('.opt-btn[data-grid]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-grid]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.saveSettings();
      });
    });

    // Wall toggle
    const wallToggle = document.getElementById('wall-toggle');
    const wallLabel = document.getElementById('wall-label');
    wallToggle.addEventListener('click', () => {
      wallToggle.classList.toggle('active');
      wallLabel.textContent = wallToggle.classList.contains('active') ? 'Ativadas' : 'Desativadas';
      this.saveSettings();
    });
  }

  setupGameListeners() {
    // Back to home
    document.getElementById('back-btn').addEventListener('click', () => {
      this.game.toMenu();
    });

    // Pause
    document.getElementById('pause-btn').addEventListener('click', () => {
      if (this.game.state === 'playing') this.game.pause();
      else if (this.game.state === 'paused') this.game.resume();
    });

    // Pause overlay click
    document.getElementById('pause-overlay').addEventListener('click', () => {
      this.game.resume();
    });

    // Retry
    document.getElementById('retry-btn').addEventListener('click', () => {
      this.applySettings();
      this.game.start();
    });

    // Menu from game over
    document.getElementById('menu-btn').addEventListener('click', () => {
      this.game.toMenu();
    });
  }

  showScreen(name) {
    this.currentScreen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${name}-screen`).classList.add('active');
  }

  applySettings() {
    const speed = document.querySelector('.opt-btn[data-speed].active')?.dataset.speed || 'normal';
    const grid = document.querySelector('.opt-btn[data-grid].active')?.dataset.grid || 'medium';
    const walls = document.getElementById('wall-toggle').classList.contains('active');
    const theme = document.querySelector('.theme-chip.active')?.dataset.theme || 'midnight';
    
    this.game.configure(speed, grid, walls);
    this.game.setTheme(theme);
    applyTheme(theme);
  }

  saveSettings() {
    const settings = {
      speed: document.querySelector('.opt-btn[data-speed].active')?.dataset.speed || 'normal',
      grid: document.querySelector('.opt-btn[data-grid].active')?.dataset.grid || 'medium',
      walls: document.getElementById('wall-toggle').classList.contains('active'),
      theme: document.querySelector('.theme-chip.active')?.dataset.theme || 'midnight',
    };
    localStorage.setItem('snake-settings', JSON.stringify(settings));
  }

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('snake-settings'));
      if (!saved) return;

      // Speed
      if (saved.speed) {
        document.querySelectorAll('.opt-btn[data-speed]').forEach(b => b.classList.remove('active'));
        document.querySelector(`.opt-btn[data-speed="${saved.speed}"]`)?.classList.add('active');
      }

      // Grid
      if (saved.grid) {
        document.querySelectorAll('.opt-btn[data-grid]').forEach(b => b.classList.remove('active'));
        document.querySelector(`.opt-btn[data-grid="${saved.grid}"]`)?.classList.add('active');
      }

      // Walls
      const wallToggle = document.getElementById('wall-toggle');
      const wallLabel = document.getElementById('wall-label');
      if (saved.walls === false) {
        wallToggle.classList.remove('active');
        wallLabel.textContent = 'Desativadas';
      } else {
        wallToggle.classList.add('active');
        wallLabel.textContent = 'Ativadas';
      }

      // Theme
      if (saved.theme) {
        document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
        document.querySelector(`.theme-chip[data-theme="${saved.theme}"]`)?.classList.add('active');
        this.game.setTheme(saved.theme);
        applyTheme(saved.theme);
      }
    } catch (e) { /* ignore */ }
  }

  updateHighscoreDisplay() {
    document.getElementById('home-highscore').textContent = this.game.highscore;
  }
}