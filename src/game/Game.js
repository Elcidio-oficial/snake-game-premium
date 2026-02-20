import { Snake } from './Snake.js';
import { Food } from './Food.js';
import { ParticleSystem } from './Particle.js';
import { Grid } from './Grid.js';
import { InputHandler } from './InputHandler.js';
import { getTheme } from './Themes.js';

const SPEEDS = {
  easy: 150,
  normal: 100,
  hard: 70,
  insane: 45,
};

const GRID_SIZES = {
  small: 15,
  medium: 20,
  large: 25,
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new InputHandler();

    this.speed = 'normal';
    this.gridSizeKey = 'medium';
    this.walls = true;
    this.gridSize = GRID_SIZES.medium;
    this.themeId = 'midnight';

    this.state = 'home';
    this.score = 0;
    this.highscore = parseInt(localStorage.getItem('snake-highscore') || '0');

    this.snake = new Snake(this.gridSize);
    this.food = new Food(this.gridSize);
    this.particles = new ParticleSystem();
    this.grid = new Grid(this.gridSize, 0, { x: 0, y: 0 });

    this.lastUpdate = 0;
    this.accumulator = 0;
    this.moveInterval = SPEEDS.normal;

    this.screenShake = 0;
    this.scoreAnimTimer = 0;

    this.lerpProgress = 1;
    this.snapshotPrev = [];
    this.snapshotCurr = [];
    this.displayPoints = [];

    this.loop = this.loop.bind(this);

    this.setupInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get theme() {
    return getTheme(this.themeId);
  }

  setTheme(id) {
    this.themeId = id;
  }

  setupInput() {
    this.input.on('direction', (dir) => {
      if (this.state === 'playing') {
        this.snake.queueDirection(dir);
      }
    });
    this.input.on('pause', () => {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    });
    this.input.on('enter', () => {
      if (this.state === 'home') {
        // Dispara o clique no botão play
        document.getElementById('play-btn')?.click();
      } else if (this.state === 'gameover') {
        document.getElementById('retry-btn')?.click();
      }
    });
    this.input.on('escape', () => {
      if (this.state === 'gameover') this.toMenu();
      else if (this.state === 'paused') this.toMenu();
    });
  }

  resize() {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;
    
    const rect = wrapper.getBoundingClientRect();
    const maxSize = Math.min(rect.width - 8, rect.height - 8);
    const size = Math.floor(maxSize);

    if (size <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.canvasSize = size;
    this.updateGridMetrics();
  }

  updateGridMetrics() {
    if (!this.canvasSize) return;
    
    const padding = 16;
    const available = this.canvasSize - padding * 2;
    this.cellSize = Math.floor(available / this.gridSize);
    const totalGrid = this.cellSize * this.gridSize;
    this.offset = {
      x: (this.canvasSize - totalGrid) / 2,
      y: (this.canvasSize - totalGrid) / 2,
    };
    this.grid.update(this.gridSize, this.cellSize, this.offset);
  }

  configure(speed, gridSizeKey, walls) {
    this.speed = speed;
    this.gridSizeKey = gridSizeKey;
    this.walls = walls;
    this.gridSize = GRID_SIZES[gridSizeKey];
    this.moveInterval = SPEEDS[speed];
  }

  takeSnapshot() {
    return this.snake.segments.map(s =>
      this.grid.cellCenter(s.x, s.y)
    );
  }

  start() {
    this.gridSize = GRID_SIZES[this.gridSizeKey];
    this.moveInterval = SPEEDS[this.speed];
    this.score = 0;

    this.snake = new Snake(this.gridSize);
    this.food = new Food(this.gridSize);
    this.food.spawn(this.snake);
    this.particles.clear();
    this.screenShake = 0;

    this.updateGridMetrics();

    const snap = this.takeSnapshot();
    this.snapshotPrev = snap.map(p => ({ ...p }));
    this.snapshotCurr = snap.map(p => ({ ...p }));
    this.displayPoints = snap.map(p => ({ ...p }));
    this.lerpProgress = 1;

    this.state = 'playing';
    this.lastUpdate = performance.now();
    this.accumulator = 0;

    this.updateUI();
    this.showScreen('game');
    this.hideOverlay('gameover-overlay');
    this.hideOverlay('pause-overlay');

    // Garantir resize após mostrar a tela
    setTimeout(() => this.resize(), 50);

    if (!this._looping) {
      this._looping = true;
      requestAnimationFrame(this.loop);
    }
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.showOverlay('pause-overlay');
    this.updatePauseButton(true);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastUpdate = performance.now();
    this.accumulator = 0;
    this.hideOverlay('pause-overlay');
    this.updatePauseButton(false);
  }

  toMenu() {
    this.state = 'home';
    this.showScreen('home');
    document.getElementById('home-highscore').textContent = this.highscore;
  }

  gameOver() {
    this.state = 'gameover';
    this.screenShake = 8;

    const headPt = this.displayPoints[0] || this.grid.cellCenter(this.snake.head.x, this.snake.head.y);
    this.particles.emit(headPt.x, headPt.y, 24, this.theme.dangerColor, {
      speed: 160, decay: 1.5, size: 3.5,
    });

    let isNewRecord = false;
    if (this.score > this.highscore) {
      this.highscore = this.score;
      localStorage.setItem('snake-highscore', this.highscore.toString());
      isNewRecord = true;
    }

    setTimeout(() => {
      document.getElementById('final-score').textContent = this.score;
      const recordEl = document.getElementById('new-record');
      if (isNewRecord && this.score > 0) {
        recordEl.classList.remove('hidden');
      } else {
        recordEl.classList.add('hidden');
      }
      this.showOverlay('gameover-overlay');
    }, 600);

    this.updateUI();
  }

  loop(timestamp) {
    if (!this._looping) return;
    requestAnimationFrame(this.loop);

    const dt = Math.min((timestamp - this.lastUpdate) / 1000, 0.1);
    this.lastUpdate = timestamp;

    if (this.state === 'playing') {
      this.accumulator += dt * 1000;

      while (this.accumulator >= this.moveInterval) {
        this.accumulator -= this.moveInterval;
        this.snapshotPrev = this.snapshotCurr.map(p => ({ ...p }));
        this.tick();
        this.snapshotCurr = this.takeSnapshot();

        while (this.snapshotPrev.length < this.snapshotCurr.length) {
          const last = this.snapshotPrev[this.snapshotPrev.length - 1];
          this.snapshotPrev.push({ ...last });
        }

        this.lerpProgress = 0;
      }

      this.lerpProgress = Math.min(this.accumulator / this.moveInterval, 1);
      this.computeDisplayPoints();
    }

    this.food.update(dt);
    this.particles.update(dt);

    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
      if (this.screenShake < 0.1) this.screenShake = 0;
    }
    if (this.scoreAnimTimer > 0) this.scoreAnimTimer -= dt;

    this.draw();
  }

  tick() {
    this.snake.update(this.walls);

    if (this.walls && this.snake.checkWallCollision()) {
      this.gameOver();
      return;
    }
    if (this.snake.checkSelfCollision()) {
      this.gameOver();
      return;
    }

    if (this.food.isAt(this.snake.head.x, this.snake.head.y)) {
      this.snake.grow();
      this.score += 10;
      this.scoreAnimTimer = 0.3;

      const center = this.grid.cellCenter(this.snake.head.x, this.snake.head.y);
      this.particles.emit(center.x, center.y, 14, this.theme.foodPrimary, {
        speed: 100, decay: 2.5, size: 2.5,
      });

      this.food.spawn(this.snake);
      this.updateUI();

      const scoreEl = document.getElementById('score');
      scoreEl.classList.add('bump');
      setTimeout(() => scoreEl.classList.remove('bump'), 200);
    }
  }

  computeDisplayPoints() {
    const prev = this.snapshotPrev;
    const curr = this.snapshotCurr;
    const len = curr.length;

    const t = this.easeInOutQuad(this.lerpProgress);

    if (this.displayPoints.length !== len) {
      this.displayPoints = new Array(len);
      for (let i = 0; i < len; i++) {
        this.displayPoints[i] = { x: 0, y: 0 };
      }
    }

    const maxJump = this.cellSize * 2;

    for (let i = 0; i < len; i++) {
      const c = curr[i];
      const p = i < prev.length ? prev[i] : c;

      const dx = c.x - p.x;
      const dy = c.y - p.y;

      if (Math.abs(dx) > maxJump || Math.abs(dy) > maxJump) {
        this.displayPoints[i].x = c.x;
        this.displayPoints[i].y = c.y;
      } else {
        this.displayPoints[i].x = p.x + dx * t;
        this.displayPoints[i].y = p.y + dy * t;
      }
    }
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  }

  splitIntoContinuousChunks(points) {
    const chunks = [];
    let current = [];
    const maxDist = this.cellSize * 1.8;

    for (let i = 0; i < points.length; i++) {
      if (current.length === 0) {
        current.push(points[i]);
      } else {
        const prev = current[current.length - 1];
        const dx = points[i].x - prev.x;
        const dy = points[i].y - prev.y;
        if (dx * dx + dy * dy > maxDist * maxDist) {
          chunks.push(current);
          current = [points[i]];
        } else {
          current.push(points[i]);
        }
      }
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  buildSmoothPath(controlPoints) {
    const len = controlPoints.length;
    if (len < 2) return controlPoints.map(p => ({ ...p }));

    if (len === 2) {
      return this.subdivideLine(controlPoints[0], controlPoints[1], 4);
    }

    const result = [];
    const tension = 0.5;
    const pts = [controlPoints[0], ...controlPoints, controlPoints[len - 1]];

    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(3, Math.min(10, Math.round(segLen / (this.cellSize * 0.3))));

      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        const tt = t * t;
        const ttt = tt * t;

        const s = tension;
        const h1 = -s * ttt + 2 * s * tt - s * t;
        const h2 = (2 - s) * ttt + (s - 3) * tt + 1;
        const h3 = (s - 2) * ttt + (3 - 2 * s) * tt + s * t;
        const h4 = s * ttt - s * tt;

        result.push({
          x: h1 * p0.x + h2 * p1.x + h3 * p2.x + h4 * p3.x,
          y: h1 * p0.y + h2 * p1.y + h3 * p2.y + h4 * p3.y,
        });
      }
    }

    result.push({ ...controlPoints[len - 1] });
    return result;
  }

  subdivideLine(a, b, steps) {
    const result = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    return result;
  }

  draw() {
    const { ctx, canvasSize } = this;
    if (!canvasSize) return;
    
    const T = this.theme;

    ctx.save();

    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2;
      const sy = (Math.random() - 0.5) * this.screenShake * 2;
      ctx.translate(sx, sy);
    }

    ctx.fillStyle = T.canvasBg;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const vGrad = ctx.createRadialGradient(
      canvasSize / 2, canvasSize / 2, canvasSize * 0.2,
      canvasSize / 2, canvasSize / 2, canvasSize * 0.7
    );
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, `rgba(0,0,0,${T.vignetteAlpha})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    this.grid.draw(ctx, T.gridDot);

    if (this.walls) {
      ctx.strokeStyle = T.wallStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.offset.x, this.offset.y, this.cellSize * this.gridSize, this.cellSize * this.gridSize);
    }

    this.drawFood(ctx);
    this.drawSnake(ctx);
    this.particles.draw(ctx);

    ctx.restore();
  }

  drawFood(ctx) {
    const T = this.theme;
    const { food, grid, cellSize } = this;
    const center = grid.cellCenter(food.position.x, food.position.y);
    const pulse = Math.sin(food.pulsePhase) * 0.12 + 1;
    const spawnScale = 1 - food.spawnAnimation;
    const baseRadius = (cellSize / 2 - 3) * pulse * spawnScale;
    if (baseRadius <= 0) return;

    const glowGrad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, baseRadius * 3.5);
    glowGrad.addColorStop(0, T.foodGlow);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, baseRadius * 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = T.foodPrimary;
    ctx.shadowColor = T.foodPrimary;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(center.x, center.y, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(center.x - baseRadius * 0.25, center.y - baseRadius * 0.3, baseRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSnake(ctx) {
    const points = this.displayPoints;
    if (!points || points.length === 0) return;

    const { cellSize } = this;

    if (points.length < 2) {
      this.drawSnakeHead(ctx, points[0], this.snake.direction, cellSize);
      return;
    }

    const chunks = this.splitIntoContinuousChunks(points);
    const totalLen = points.length;
    const bodyWidth = cellSize * 0.72;
    const tailTip = cellSize * 0.15;

    let globalOffset = 0;

    for (let c = 0; c < chunks.length; c++) {
      const chunk = chunks[c];
      if (chunk.length < 2) { globalOffset += chunk.length; continue; }

      const smooth = this.buildSmoothPath(chunk);

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.filter = 'blur(4px)';
      this.drawBody(ctx, smooth, bodyWidth + 3, tailTip + 1, totalLen, globalOffset, chunk.length, true);
      ctx.restore();

      this.drawBody(ctx, smooth, bodyWidth, tailTip, totalLen, globalOffset, chunk.length, false);
      this.drawShine(ctx, smooth, bodyWidth, tailTip, totalLen, globalOffset, chunk.length);

      if (c === 0) {
        this.drawSnakeHead(ctx, smooth[0], this.snake.direction, cellSize);
      }

      globalOffset += chunk.length;
    }
  }

  widthAt(t, maxW, minW) {
    let w;
    if (t < 0.06) w = 0.82 + t * 3;
    else if (t < 0.2) w = 1.0;
    else {
      const f = (t - 0.2) / 0.8;
      w = 1.0 - f * f * 0.85;
    }
    return Math.max(maxW * w * 0.5, minW * 0.5);
  }

  computeBodyGeometry(points, maxW, minW, totalSegs, gOff, chunkSegs) {
    const len = points.length;
    const normals = new Array(len);
    const widths = new Array(len);

    for (let i = 0; i < len; i++) {
      let tx, ty;
      if (i === 0) {
        tx = points[1].x - points[0].x;
        ty = points[1].y - points[0].y;
      } else if (i === len - 1) {
        tx = points[i].x - points[i - 1].x;
        ty = points[i].y - points[i - 1].y;
      } else {
        tx = points[i + 1].x - points[i - 1].x;
        ty = points[i + 1].y - points[i - 1].y;
      }

      const mag = Math.sqrt(tx * tx + ty * ty) || 1;
      normals[i] = { x: -ty / mag, y: tx / mag };

      const localT = i / Math.max(len - 1, 1);
      const globalT = (gOff + localT * chunkSegs) / Math.max(totalSegs - 1, 1);
      widths[i] = this.widthAt(globalT, maxW, minW);
    }

    return { normals, widths };
  }

  drawBody(ctx, points, maxW, minW, totalSegs, gOff, chunkSegs, isShadow) {
    if (points.length < 2) return;
    const T = this.theme;
    const len = points.length;
    const { normals, widths } = this.computeBodyGeometry(points, maxW, minW, totalSegs, gOff, chunkSegs);

    ctx.save();
    ctx.beginPath();

    const lx0 = points[0].x + normals[0].x * widths[0];
    const ly0 = points[0].y + normals[0].y * widths[0];
    ctx.moveTo(lx0, ly0);

    for (let i = 1; i < len; i++) {
      ctx.lineTo(
        points[i].x + normals[i].x * widths[i],
        points[i].y + normals[i].y * widths[i]
      );
    }

    const lp = points[len - 1];
    const ln = normals[len - 1];
    const lw = widths[len - 1];
    ctx.arc(lp.x, lp.y, lw, Math.atan2(ln.y, ln.x), Math.atan2(-ln.y, -ln.x), false);

    for (let i = len - 2; i >= 0; i--) {
      ctx.lineTo(
        points[i].x - normals[i].x * widths[i],
        points[i].y - normals[i].y * widths[i]
      );
    }

    const fp = points[0];
    const fn = normals[0];
    const fw = widths[0];
    ctx.arc(fp.x, fp.y, fw, Math.atan2(-fn.y, -fn.x), Math.atan2(fn.y, fn.x), false);

    ctx.closePath();

    if (isShadow) {
      ctx.fillStyle = T.shadowFill;
    } else {
      ctx.fillStyle = T.snakeBody;
    }
    ctx.fill();

    if (!isShadow) {
      ctx.strokeStyle = T.wallStroke;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawShine(ctx, points, maxW, minW, totalSegs, gOff, chunkSegs) {
    if (points.length < 4) return;
    const T = this.theme;
    const len = points.length;
    const shineLen = Math.floor(len * 0.6);
    if (shineLen < 3) return;

    const { normals, widths } = this.computeBodyGeometry(
      points.slice(0, shineLen), maxW, minW, totalSegs, gOff, chunkSegs
    );

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.beginPath();

    for (let i = 0; i < shineLen; i++) {
      const p = points[i];
      const n = normals[i];
      const w = widths[i];
      const x = p.x + n.x * w * 0.5;
      const y = p.y + n.y * w * 0.5;

      if (i === 0) ctx.moveTo(x + n.x * w * 0.25, y + n.y * w * 0.25);
      else ctx.lineTo(x + n.x * w * 0.25, y + n.y * w * 0.25);
    }

    for (let i = shineLen - 1; i >= 0; i--) {
      const p = points[i];
      const n = normals[i];
      const w = widths[i];
      const x = p.x + n.x * w * 0.5;
      const y = p.y + n.y * w * 0.5;
      ctx.lineTo(x + n.x * w * 0.05, y + n.y * w * 0.05);
    }

    ctx.closePath();
    ctx.fillStyle = T.shineFill;
    ctx.fill();
    ctx.restore();
  }

  drawSnakeHead(ctx, pos, direction, cellSize) {
    const T = this.theme;
    const headR = cellSize * 0.42;

    ctx.save();

    const gg = ctx.createRadialGradient(pos.x, pos.y, headR * 0.3, pos.x, pos.y, headR * 2);
    gg.addColorStop(0, T.foodGlow.replace(/[\d.]+\)$/, '0.06)'));
    gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, headR * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(Math.atan2(direction.y, direction.x));

    ctx.beginPath();
    ctx.ellipse(headR * 0.08, 0, headR * 1.1, headR * 0.92, 0, 0, Math.PI * 2);
    ctx.fillStyle = T.snakeHead;
    ctx.fill();
    ctx.strokeStyle = T.wallStroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(-headR * 0.1, -headR * 0.3, headR * 0.5, headR * 0.16, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = T.shineFill;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();

    this.drawEyes(ctx, pos, direction, headR);
    this.drawTongue(ctx, pos, direction, headR);

    ctx.restore();
  }

  drawEyes(ctx, center, dir, headR) {
    const T = this.theme;
    const eyeDist = headR * 0.42;
    const eyeFwd = headR * 0.28;
    const eyeR = headR * 0.2;
    const pupilR = headR * 0.11;

    const angle = Math.atan2(dir.y, dir.x);
    const px = -Math.sin(angle), py = Math.cos(angle);
    const fx = Math.cos(angle), fy = Math.sin(angle);

    const eyes = [
      { x: center.x + px * eyeDist + fx * eyeFwd, y: center.y + py * eyeDist + fy * eyeFwd },
      { x: center.x - px * eyeDist + fx * eyeFwd, y: center.y - py * eyeDist + fy * eyeFwd },
    ];

    eyes.forEach(eye => {
      ctx.fillStyle = T.snakeEye;
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, eyeR, 0, Math.PI * 2);
      ctx.fill();

      const ox = fx * eyeR * 0.2;
      const oy = fy * eyeR * 0.2;

      ctx.fillStyle = T.snakeEyePupil;
      ctx.beginPath();
      ctx.arc(eye.x + ox, eye.y + oy, pupilR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(eye.x + ox + pupilR * 0.3, eye.y + oy - pupilR * 0.3, pupilR * 0.28, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawTongue(ctx, pos, dir, headR) {
    const T = this.theme;
    const time = performance.now() / 1000;
    const phase = Math.sin(time * 4);
    if (phase < 0.3) return;

    const ext = (phase - 0.3) / 0.7;
    const angle = Math.atan2(dir.y, dir.x);
    const fx = Math.cos(angle), fy = Math.sin(angle);
    const tLen = headR * 0.75 * ext;
    const fLen = headR * 0.22 * ext;

    const bx = pos.x + fx * headR * 0.95;
    const by = pos.y + fy * headR * 0.95;
    const tx = bx + fx * tLen;
    const ty = by + fy * tLen;

    ctx.save();
    ctx.strokeStyle = T.tongueFill;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.7;

    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(angle - 0.35) * fLen, ty + Math.sin(angle - 0.35) * fLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(angle + 0.35) * fLen, ty + Math.sin(angle + 0.35) * fLen); ctx.stroke();

    ctx.restore();
  }

  // ============================================
  // UI HELPERS
  // ============================================

  updateUI() {
    const scoreEl = document.getElementById('score');
    const highscoreEl = document.getElementById('highscore');
    const homeHighscoreEl = document.getElementById('home-highscore');
    
    if (scoreEl) scoreEl.textContent = this.score;
    if (highscoreEl) highscoreEl.textContent = this.highscore;
    if (homeHighscoreEl) homeHighscoreEl.textContent = this.highscore;
  }

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(`${name}-screen`);
    if (screen) {
      screen.classList.add('active');
    }
  }

  showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  updatePauseButton(isPaused) {
    const pi = document.querySelector('.pause-icon');
    const pl = document.querySelector('.play-icon');
    if (pi && pl) {
      if (isPaused) {
        pi.classList.add('hidden');
        pl.classList.remove('hidden');
      } else {
        pi.classList.remove('hidden');
        pl.classList.add('hidden');
      }
    }
  }
}