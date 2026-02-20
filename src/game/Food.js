export class Food {
  constructor(gridSize) {
    this.gridSize = gridSize;
    this.position = { x: 0, y: 0 };
    this.pulsePhase = 0;
    this.spawnAnimation = 0;
  }

  spawn(snake) {
    let pos;
    let attempts = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize),
      };
      attempts++;
    } while (snake.occupies(pos.x, pos.y) && attempts < 1000);

    this.position = pos;
    this.spawnAnimation = 1;
  }

  update(dt) {
    this.pulsePhase += dt * 3;
    if (this.spawnAnimation > 0) {
      this.spawnAnimation = Math.max(0, this.spawnAnimation - dt * 4);
    }
  }

  isAt(x, y) {
    return this.position.x === x && this.position.y === y;
  }
}