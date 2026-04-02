import { vec2Mag } from './utils.js';

// Safe landing thresholds
const SAFE_DESCENT_RATE = 3;       // gu/s — max descent rate for soft landing
const SAFE_HORIZONTAL_VEL = 4;     // gu/s — max horizontal velocity for soft landing
const APPROACH_FACTOR = 3;         // approach threshold = body.radius * APPROACH_FACTOR
const CRUSH_FACTOR = 0.5;          // crush threshold = body.radius * CRUSH_FACTOR

// Module-level state
let _state = 'inactive';
let _altitude = 0;
let _descentRate = 0;
let _horizontalVelocity = 0;
let _surfaceGravity = 0;
let _isGasGiant = false;
let _bodyName = '';
let _body = null;

function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

function cross2d(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function isLandableKind(body) {
  return body.kind === 'planet' || body.kind === 'moon';
}

export function updateLanding(ship, dt) {
  const body = ship.currentSOIBody;

  // No SOI body or not a landable kind — go inactive
  if (!body || !isLandableKind(body)) {
    _state = 'inactive';
    _body = null;
    return _state;
  }

  // Terminal states — stay until reset
  if (_state === 'landed' || _state === 'crashed' || _state === 'crushed') {
    return _state;
  }

  const pos = { x: ship.x, y: ship.y };
  const vel = { x: ship.vx, y: ship.vy };
  const distance = vec2Mag(pos);

  // Avoid division-by-zero if ship somehow lands exactly at origin
  if (distance < 0.001) {
    return _state;
  }

  const altitude = distance - body.radius;
  const escapeVel = Math.sqrt(2 * body.mu / distance);
  const speed = vec2Mag(vel);

  // Radial velocity component — positive = descending (toward body)
  const descentRate = -dot(pos.x, pos.y, vel.x, vel.y) / distance;
  // Tangential velocity component — magnitude of cross product / distance
  const horizontalVelocity = Math.abs(cross2d(pos.x, pos.y, vel.x, vel.y)) / distance;

  const surfaceGravity = body.mu / (body.radius * body.radius);
  const gasGiant = body.subtype === 'Gas Giant';

  // Update telemetry
  _altitude = altitude;
  _descentRate = descentRate;
  _horizontalVelocity = horizontalVelocity;
  _surfaceGravity = surfaceGravity;
  _isGasGiant = gasGiant;
  _bodyName = body.name;
  _body = body;

  const approachThreshold = body.radius * APPROACH_FACTOR;
  const crushThreshold = body.radius * CRUSH_FACTOR;

  if (_state === 'inactive') {
    // Transition to approach when close enough and below escape velocity
    if (altitude < approachThreshold && speed < escapeVel) {
      _state = 'approach';
    }
    return _state;
  }

  if (_state === 'approach') {
    // Gas giant crush check (takes priority over altitude <= 0)
    if (gasGiant && altitude < crushThreshold) {
      _state = 'crushed';
      return _state;
    }

    // Surface contact
    if (altitude <= 0) {
      if (descentRate < SAFE_DESCENT_RATE && horizontalVelocity < SAFE_HORIZONTAL_VEL) {
        if (gasGiant) {
          _state = 'crushed';
        } else {
          _state = 'landed';
          // Lock ship to surface
          ship.vx = 0;
          ship.vy = 0;
          ship.x = pos.x / distance * body.radius;
          ship.y = pos.y / distance * body.radius;
          ship.landed = true;
        }
      } else {
        _state = 'crashed';
      }
      return _state;
    }

    // Pulled away from approach
    if (altitude >= approachThreshold || speed >= escapeVel) {
      _state = 'inactive';
      _body = null;
    }
  }

  return _state;
}

export function getLandingState() {
  return {
    state: _state,
    altitude: _altitude,
    descentRate: _descentRate,
    horizontalVelocity: _horizontalVelocity,
    surfaceGravity: _surfaceGravity,
    isGasGiant: _isGasGiant,
    bodyName: _bodyName,
    body: _body,
  };
}

export function resetLanding() {
  _state = 'inactive';
  _altitude = 0;
  _descentRate = 0;
  _horizontalVelocity = 0;
  _surfaceGravity = 0;
  _isGasGiant = false;
  _bodyName = '';
  _body = null;
}
