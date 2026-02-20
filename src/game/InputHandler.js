export class InputHandler {
  constructor() {
    this.callbacks = {};
    this.setupKeyboard();
    this.setupTouch();
    this.setupMobileButtons();
  }

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault();
          this.emit('direction', { x: 0, y: -1 });
          break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault();
          this.emit('direction', { x: 0, y: 1 });
          break;
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault();
          this.emit('direction', { x: -1, y: 0 });
          break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault();
          this.emit('direction', { x: 1, y: 0 });
          break;
        case 'p': case 'P':
          this.emit('pause');
          break;
        case 'Enter':
          this.emit('enter');
          break;
        case 'Escape':
          this.emit('escape');
          break;
      }
    });
  }

  setupTouch() {
    let startX, startY, startTime;
    const minSwipe = 30;

    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (!startX || !startY) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Date.now() - startTime;

      if (dt > 500) return;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
        this.emit('pause');
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        this.emit('direction', { x: dx > 0 ? 1 : -1, y: 0 });
      } else {
        this.emit('direction', { x: 0, y: dy > 0 ? 1 : -1 });
      }
    }, { passive: false });
  }

  setupMobileButtons() {
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      const dir = btn.dataset.dir;
      const dirMap = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };

      const handler = (e) => {
        e.preventDefault();
        if (dirMap[dir]) {
          this.emit('direction', dirMap[dir]);
        }
      };

      btn.addEventListener('touchstart', handler, { passive: false });
      btn.addEventListener('mousedown', handler);
    });
  }
}