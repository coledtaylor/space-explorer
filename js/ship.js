import { computeOrbitalElements, gravityAcceleration } from './orbit.js';
import { vec2Mag } from './utils.js';

const THRUST_POWER = 20;
const FUEL_CONSUMPTION_RATE = 5;

export class Ship {
  constructor() {
    this.x = 0;
    this.y = -300;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.fuel = 100;
    this.thrustActive = false;
    this.currentSOIBody = null;
    this.orbit = { a: 0, e: 0, omega: 0, nu: 0, T: 0, apoapsis: 0, periapsis: 0, altitude: 0 };
  }

  update(dt, input, currentSOIBody) {
    // Heading from mouse aim
    this.angle = input.aimAngle;

    // Gravity — ship pos is relative to SOI body, so body is at origin
    const grav = gravityAcceleration({ x: this.x, y: this.y }, { x: 0, y: 0 }, currentSOIBody.mu);
    this.vx += grav.x * dt;
    this.vy += grav.y * dt;

    // Thrust
    this.thrustActive = false;
    if (this.fuel > 0) {
      if (input.up) {
        // Prograde: thrust along heading direction
        this.vx += Math.sin(this.angle) * THRUST_POWER * dt;
        this.vy += -Math.cos(this.angle) * THRUST_POWER * dt;
        this.fuel = Math.max(0, this.fuel - FUEL_CONSUMPTION_RATE * dt);
        this.thrustActive = true;
      } else if (input.down) {
        // Retrograde: thrust opposite to heading
        this.vx -= Math.sin(this.angle) * THRUST_POWER * dt;
        this.vy -= -Math.cos(this.angle) * THRUST_POWER * dt;
        this.fuel = Math.max(0, this.fuel - FUEL_CONSUMPTION_RATE * dt);
        this.thrustActive = true;
      }
    }

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Orbital elements
    const pos = { x: this.x, y: this.y };
    const vel = { x: this.vx, y: this.vy };
    const elements = computeOrbitalElements(pos, vel, currentSOIBody.mu);
    const apoapsis = elements.a * (1 + elements.e);
    const periapsis = elements.a * (1 - elements.e);
    const altitude = vec2Mag(pos) - currentSOIBody.radius;
    this.orbit = {
      a: elements.a,
      e: elements.e,
      omega: elements.omega,
      nu: elements.nu,
      T: elements.T,
      apoapsis,
      periapsis,
      altitude,
    };
  }

  getSpeed() {
    return vec2Mag({ x: this.vx, y: this.vy });
  }

  getOrbitalState() {
    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
  }

  draw(ctx, camera) {
    const sx = this.x - camera.x + ctx.canvas.width / 2;
    const sy = this.y - camera.y + ctx.canvas.height / 2;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    // Engine glow
    if (this.thrustActive && this.fuel > 0) {
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
