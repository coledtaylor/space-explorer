import { clamp } from './utils.js';

export class Ship {
  constructor() {
    this.x = 0;
    this.y = -300;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.thrust = 0;
    this.maxSpeed = 400;
    this.acceleration = 200;
    this.drag = 0.98;
    this.fuel = 100;
    this.trail = [];
  }

  update(dt, input) {
    // Rotate toward mouse
    this.angle = input.aimAngle;

    // Thrust
    this.thrust = 0;
    if (this.fuel > 0) {
      let ax = 0, ay = 0;
      if (input.up) { ay -= 1; this.thrust = 1; }
      if (input.down) { ay += 1; this.thrust = 1; }
      if (input.left) { ax -= 1; this.thrust = 1; }
      if (input.right) { ax += 1; this.thrust = 1; }

      const len = Math.sqrt(ax * ax + ay * ay);
      if (len > 0) {
        ax /= len;
        ay /= len;
        this.vx += ax * this.acceleration * dt;
        this.vy += ay * this.acceleration * dt;
        this.fuel = Math.max(0, this.fuel - dt * 2);
      }
    }

    // Drag
    this.vx *= this.drag;
    this.vy *= this.drag;

    // Clamp speed
    const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Trail
    this.trail.push({ x: this.x, y: this.y, age: 0 });
    if (this.trail.length > 60) this.trail.shift();
    for (const p of this.trail) p.age += dt;
  }

  getSpeed() {
    return Math.sqrt(this.vx ** 2 + this.vy ** 2);
  }

  draw(ctx, camera) {
    // Trail
    for (let i = 1; i < this.trail.length; i++) {
      const p = this.trail[i];
      const pp = this.trail[i - 1];
      const alpha = (1 - p.age / 2) * 0.3;
      if (alpha <= 0) continue;
      const sx = p.x - camera.x + ctx.canvas.width / 2;
      const sy = p.y - camera.y + ctx.canvas.height / 2;
      const psx = pp.x - camera.x + ctx.canvas.width / 2;
      const psy = pp.y - camera.y + ctx.canvas.height / 2;
      ctx.beginPath();
      ctx.moveTo(psx, psy);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const sx = this.x - camera.x + ctx.canvas.width / 2;
    const sy = this.y - camera.y + ctx.canvas.height / 2;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    // Engine glow
    if (this.thrust > 0 && this.fuel > 0) {
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(0, 18 + Math.random() * 6);
      ctx.lineTo(6, 8);
      ctx.fillStyle = 'rgba(100, 180, 255, 0.7)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-3, 8);
      ctx.lineTo(0, 14 + Math.random() * 4);
      ctx.lineTo(3, 8);
      ctx.fillStyle = 'rgba(200, 230, 255, 0.9)';
      ctx.fill();
    }

    // Ship body
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-9, 10);
    ctx.lineTo(-3, 7);
    ctx.lineTo(0, 9);
    ctx.lineTo(3, 7);
    ctx.lineTo(9, 10);
    ctx.closePath();
    ctx.fillStyle = '#c0d0e0';
    ctx.fill();
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
