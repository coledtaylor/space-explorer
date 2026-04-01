import { seededRandom } from './utils.js';

export class Starfield {
  constructor() {
    this.layers = [
      { count: 200, parallax: 0.05, size: 1, opacity: 0.4 },
      { count: 150, parallax: 0.1, size: 1.5, opacity: 0.6 },
      { count: 80, parallax: 0.2, size: 2, opacity: 0.8 },
    ];
    this.stars = this.layers.map(layer => {
      const rng = seededRandom(layer.count * 7 + 31);
      const stars = [];
      for (let i = 0; i < layer.count; i++) {
        stars.push({
          x: rng() * 4000 - 2000,
          y: rng() * 4000 - 2000,
          twinkleOffset: rng() * Math.PI * 2,
          twinkleSpeed: 0.5 + rng() * 2,
        });
      }
      return stars;
    });
  }

  draw(ctx, camera, time) {
    this.layers.forEach((layer, li) => {
      const stars = this.stars[li];
      stars.forEach(star => {
        const sx = (star.x - camera.x * layer.parallax) % 4000;
        const sy = (star.y - camera.y * layer.parallax) % 4000;
        const screenX = sx + ctx.canvas.width / 2;
        const screenY = sy + ctx.canvas.height / 2;

        if (screenX < -10 || screenX > ctx.canvas.width + 10 ||
            screenY < -10 || screenY > ctx.canvas.height + 10) return;

        const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
        const alpha = layer.opacity * (0.6 + 0.4 * twinkle);

        ctx.beginPath();
        ctx.arc(screenX, screenY, layer.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
        ctx.fill();
      });
    });
  }
}
