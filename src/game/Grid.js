export class Grid {
  constructor(gridSize, cellSize, offset) {
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.offset = offset;
  }

  update(gridSize, cellSize, offset) {
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.offset = offset;
  }

  draw(ctx, dotColor) {
    const { cellSize, offset, gridSize } = this;
    ctx.fillStyle = dotColor || 'rgba(255, 255, 255, 0.03)';

    for (let x = 0; x <= gridSize; x++) {
      for (let y = 0; y <= gridSize; y++) {
        ctx.beginPath();
        ctx.arc(
          offset.x + x * cellSize,
          offset.y + y * cellSize,
          0.7, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  cellCenter(gridX, gridY) {
    return {
      x: this.offset.x + gridX * this.cellSize + this.cellSize / 2,
      y: this.offset.y + gridY * this.cellSize + this.cellSize / 2,
    };
  }
}