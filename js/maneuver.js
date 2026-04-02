import { stateFromOrbitalElements } from './orbit.js';

// Module-level array of active maneuver nodes
export const maneuverNodes = [];

// Base handle length in world units
const HANDLE_BASE_LENGTH = 30;
// Scale factor: world units per unit of delta-v
const HANDLE_DV_SCALE = 0.5;
// Hit-test radius in world units
const HANDLE_HIT_RADIUS = 12;

// Create a maneuver node at the given true anomaly on the ship's current orbit
export function createManeuverNode(nu, orbitalElements, soiBody) {
  return {
    nu,
    // Shallow copy of orbital elements so node is independent of live state
    orbitalElements: {
      a: orbitalElements.a,
      e: orbitalElements.e,
      omega: orbitalElements.omega,
      nu: orbitalElements.nu,
      T: orbitalElements.T,
    },
    soiBody,
    burnVector: { prograde: 0, normal: 0 },
  };
}

// World-space {x, y} of the node on the orbit, offset by SOI body world position
export function getNodeWorldPosition(node) {
  const { a, e, omega } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const { pos } = stateFromOrbitalElements(a, e, omega, node.nu, mu);

  // SOI body world offset: star is at origin; planets/moons have .x/.y world coords
  const bodyX = node.soiBody.x || 0;
  const bodyY = node.soiBody.y || 0;

  return { x: pos.x + bodyX, y: pos.y + bodyY };
}

// Velocity direction angle at the node's true anomaly
function velocityAngle(node) {
  const { a, e, omega } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const { vel } = stateFromOrbitalElements(a, e, omega, node.nu, mu);
  return Math.atan2(vel.y, vel.x);
}

// Return four handle endpoints (world-space {x, y}) keyed by direction name
// Handle length = HANDLE_BASE_LENGTH + |component| * HANDLE_DV_SCALE
export function getHandlePositions(node, zoom) {
  const origin = getNodeWorldPosition(node);
  const angle = velocityAngle(node);
  const z = zoom || 1;

  // Prograde = velocity direction, normal = 90 degrees CCW from prograde
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Scale handle length inversely with zoom so handles stay grabbable at map zoom
  const baseLen = HANDLE_BASE_LENGTH / z;
  const dvScale = HANDLE_DV_SCALE / z;

  // Prograde/retrograde axis
  const pgLen = baseLen + Math.abs(node.burnVector.prograde) * dvScale;
  // Normal/radial axis (perpendicular: rotate 90 deg CCW => (-sinA, cosA))
  const nmLen = baseLen + Math.abs(node.burnVector.normal) * dvScale;

  return {
    prograde: {
      x: origin.x + cosA * pgLen,
      y: origin.y + sinA * pgLen,
    },
    retrograde: {
      x: origin.x - cosA * pgLen,
      y: origin.y - sinA * pgLen,
    },
    normal: {
      x: origin.x + (-sinA) * nmLen,
      y: origin.y + cosA * nmLen,
    },
    radial: {
      x: origin.x - (-sinA) * nmLen,
      y: origin.y - cosA * nmLen,
    },
  };
}

// Returns which handle name is within grab radius of (worldX, worldY), or null
export function hitTestHandles(node, worldX, worldY, handleLength, zoom) {
  const handles = getHandlePositions(node, zoom);
  const names = ['prograde', 'retrograde', 'normal', 'radial'];
  const grabRadius = handleLength !== undefined ? handleLength : HANDLE_HIT_RADIUS;

  for (const name of names) {
    const h = handles[name];
    const dx = worldX - h.x;
    const dy = worldY - h.y;
    if (Math.sqrt(dx * dx + dy * dy) <= grabRadius) {
      return name;
    }
  }
  return null;
}

// Update the burn vector based on which handle is dragged and the world-space drag delta
// prograde/retrograde control the prograde axis; normal/radial control the normal axis
export function updateBurnFromDrag(node, handle, dragDeltaWorld) {
  const angle = velocityAngle(node);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Sensitivity: higher value = more drag needed per unit delta-v
  const sensitivity = 5;

  if (handle === 'prograde') {
    const proj = dragDeltaWorld.x * cosA + dragDeltaWorld.y * sinA;
    node.burnVector.prograde += proj / sensitivity;
  } else if (handle === 'retrograde') {
    const proj = dragDeltaWorld.x * cosA + dragDeltaWorld.y * sinA;
    node.burnVector.prograde -= proj / sensitivity;
  } else if (handle === 'normal') {
    const proj = dragDeltaWorld.x * (-sinA) + dragDeltaWorld.y * cosA;
    node.burnVector.normal += proj / sensitivity;
  } else if (handle === 'radial') {
    const proj = dragDeltaWorld.x * (-sinA) + dragDeltaWorld.y * cosA;
    node.burnVector.normal -= proj / sensitivity;
  }
}

// Compute post-burn state vector in SOI-relative coords
// Returns { x, y, vx, vy }
export function getPostBurnState(node) {
  const { a, e, omega } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const { pos, vel } = stateFromOrbitalElements(a, e, omega, node.nu, mu);

  // Velocity direction at node (prograde angle)
  const angle = Math.atan2(vel.y, vel.x);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Rotate burn vector from orbital frame to world frame
  // prograde component along velocity direction; normal component perpendicular (CCW)
  const dvx = node.burnVector.prograde * cosA + node.burnVector.normal * (-sinA);
  const dvy = node.burnVector.prograde * sinA + node.burnVector.normal * cosA;

  return {
    x: pos.x,
    y: pos.y,
    vx: vel.x + dvx,
    vy: vel.y + dvy,
  };
}

// Total delta-v magnitude of the burn
export function getManeuverDeltaV(node) {
  return Math.sqrt(
    node.burnVector.prograde * node.burnVector.prograde +
    node.burnVector.normal * node.burnVector.normal
  );
}
