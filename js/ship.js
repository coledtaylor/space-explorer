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
    this.fuel = 1000;
    this.thrustActive = false;
    this.currentSOIBody = null;
    this.activeManeuver = null;
    this.landed = false;
    this.orbit = { a: 0, e: 0, omega: 0, nu: 0, T: 0, apoapsis: 0, periapsis: 0, altitude: 0 };
  }

  update(dt, input, currentSOIBody) {
    // When landed, skip gravity/thrust/integration — ship is stationary on surface
    // Angle updates still run so the player can orient for launch
    if (this.landed) {
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
      return;
    }

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

  draw(ctx, camera, worldPos, zoom) {
    zoom = zoom || 1;
    // Use world-space position if provided (needed when in planet SOI)
    const wx = worldPos ? worldPos.x : this.x;
    const wy = worldPos ? worldPos.y : this.y;

    // When landed, lock angle to surface normal (nose away from body center)
    // Ship position is SOI-relative, body at origin, so normal = atan2(y, x) + PI/2
    // (ship triangle nose is at -14 in local Y, so +PI/2 rotates nose outward)
    let drawAngle = this.angle;
    let drawWx = wx;
    let drawWy = wy;
    if (this.landed) {
      // Angle pointing radially outward from body center (nose points away from surface)
      // Ship local coords: nose at y=-14, engine base at y=+10
      // With this angle, -Y (nose) faces outward, +Y (engine) faces body surface
      drawAngle = Math.atan2(this.y, this.x) - Math.PI / 2;
      // Shift draw position outward so the engine base (+10 screen px) sits exactly on the surface
      // offset = 10 screen pixels outward = 10/zoom world units
      const dist2 = Math.sqrt(this.x * this.x + this.y * this.y);
      if (dist2 > 0) {
        const normalX = this.x / dist2;
        const normalY = this.y / dist2;
        drawWx = wx + normalX * 10 / zoom;
        drawWy = wy + normalY * 10 / zoom;
      }
    }

    const sx = (drawWx - camera.x) * zoom + ctx.canvas.width / 2;
    const sy = (drawWy - camera.y) * zoom + ctx.canvas.height / 2;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(drawAngle);

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
