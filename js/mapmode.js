import { lerp } from './utils.js';

export class MapMode {
  constructor() {
    this.active = false;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.transitioning = false;
  }

  toggle() {
    this.active = !this.active;
    if (this.active) {
      // Will be computed properly in update() once system is known
      this.targetZoom = 0.1;
    } else {
      this.targetZoom = 1.0;
    }
  }

  // Compute the world-space center of the current SOI body
  _soiCenter(ship, system) {
    const body = ship.currentSOIBody;
    if (!body || body === system.star || body.kind === 'star') {
      return { x: 0, y: 0 };
    }
    // Planet or moon — body.x/y are already world-space positions
    return { x: body.x, y: body.y };
  }

  // Find the outermost orbit radius in the system
  _maxOrbitRadius(system) {
    let maxR = 0;
    for (const planet of system.planets) {
      if (planet.orbitalElements && planet.orbitalElements.a > maxR) {
        maxR = planet.orbitalElements.a;
      }
    }
    return maxR;
  }

  update(dt, ship, system, canvas, flightCamera) {
    // Recompute target zoom based on system extents when in map mode
    if (this.active) {
      const maxR = this._maxOrbitRadius(system);
      if (maxR > 0) {
        this.targetZoom = Math.min(canvas.width, canvas.height) / (maxR * 2.5);
      }
    }

    // Lerp zoom toward target
    const lerpFactor = 0.05;
    this.zoom = lerp(this.zoom, this.targetZoom, lerpFactor);

    // Determine if we are mid-transition
    const zoomDelta = Math.abs(this.zoom - this.targetZoom);
    this.transitioning = zoomDelta > 0.001;

    // Compute target camera center
    if (this.active) {
      const center = this._soiCenter(ship, system);
      this.cameraX = lerp(this.cameraX, center.x, lerpFactor);
      this.cameraY = lerp(this.cameraY, center.y, lerpFactor);
    } else {
      // Converge back to flight camera position
      this.cameraX = lerp(this.cameraX, flightCamera.x, lerpFactor);
      this.cameraY = lerp(this.cameraY, flightCamera.y, lerpFactor);
    }
  }

  getCamera() {
    return { x: this.cameraX, y: this.cameraY };
  }

  getZoom() {
    return this.zoom;
  }

  isActive() {
    return this.active || this.transitioning;
  }
}
