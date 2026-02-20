export class Snake {
  constructor(gridSize) {
    this.gridSize = gridSize;
    this.reset();
  }

  reset() {
    const mid = Math.floor(this.gridSize / 2);
    this.segments = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
      { x: mid - 4, y: mid },
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.growing = false;
    this.directionQueue = [];
  }

  get head() {
    return this.segments[0];
  }

  queueDirection(dir) {
    const queue = this.directionQueue;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : this.direction;
    if (dir.x === -lastDir.x && dir.y === -lastDir.y) return;
    if (dir.x === lastDir.x && dir.y === lastDir.y) return;
    if (queue.length < 3) {
      queue.push(dir);
    }
  }

  update(walls) {
    if (this.directionQueue.length > 0) {
      const next = this.directionQueue.shift();
      if (!(next.x === -this.direction.x && next.y === -this.direction.y)) {
        this.direction = next;
      }
    }

    const newHead = {
      x: this.head.x + this.direction.x,
      y: this.head.y + this.direction.y,
    };

    if (!walls) {
      if (newHead.x < 0) newHead.x = this.gridSize - 1;
      if (newHead.x >= this.gridSize) newHead.x = 0;
      if (newHead.y < 0) newHead.y = this.gridSize - 1;
      if (newHead.y >= this.gridSize) newHead.y = 0;
    }

    this.segments.unshift(newHead);
    if (!this.growing) {
      this.segments.pop();
    }
    this.growing = false;
  }

  grow() {
    this.growing = true;
  }

  checkSelfCollision() {
    return this.segments.slice(1).some(
      seg => seg.x === this.head.x && seg.y === this.head.y
    );
  }

  checkWallCollision() {
    return (
      this.head.x < 0 ||
      this.head.x >= this.gridSize ||
      this.head.y < 0 ||
      this.head.y >= this.gridSize
    );
  }

  occupies(x, y) {
    return this.segments.some(seg => seg.x === x && seg.y === y);
  }
}