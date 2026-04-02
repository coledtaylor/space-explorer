import { stateFromOrbitalElements } from './orbit.js';
import type { MassiveBody, OrbitalElements, Vec2 } from '../types/index.js';

// Base handle length in world units
const HANDLE_BASE_LENGTH = 30;
// Scale factor: world units per unit of delta-v
const HANDLE_DV_SCALE = 0.5;
// Hit-test radius in world units
const HANDLE_HIT_RADIUS = 12;

export interface BurnVector {
  prograde: number;
  normal: number;
}

export interface ManeuverNode {
  // True anomaly on the orbit where the burn occurs
  nu: number;
  // Snapshot of orbital elements at time of node creation (independent of live state)
  orbitalElements: Pick<OrbitalElements, 'a' | 'e' | 'omega'>;
  // The SOI body the ship is orbiting when this node fires
  soiBody: MassiveBody;
  burnVector: BurnVector;
}

// Handle directions supported for hit-testing and drag
export type HandleName = 'prograde' | 'retrograde' | 'normal' | 'radial';

// World-space positions for all four handles of a maneuver node
export interface HandlePositions {
  prograde: Vec2;
  retrograde: Vec2;
  normal: Vec2;
  radial: Vec2;
}

// Create a maneuver node at the given true anomaly on the ship's current orbit
export function createManeuverNode(
  nu: number,
  orbitalElements: OrbitalElements,
  soiBody: MassiveBody,
): ManeuverNode {
  return {
    nu,
    // Shallow copy so node is independent of live orbital state
    orbitalElements: {
      a: orbitalElements.a,
      e: orbitalElements.e,
      omega: orbitalElements.omega,
    },
    soiBody,
    burnVector: { prograde: 0, normal: 0 },
  };
}

// World-space position of the node on its orbit, offset by the SOI body's world position
export function getNodeWorldPosition(node: ManeuverNode): Vec2 {
  const { a, e, omega } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const { pos } = stateFromOrbitalElements(a, e, omega, node.nu, mu);

  // SOI body world offset: star is at origin; planets/moons have .x/.y world coords
  const bodyX = node.soiBody.x ?? 0;
  const bodyY = node.soiBody.y ?? 0;

  return { x: pos.x + bodyX, y: pos.y + bodyY };
}

// Velocity direction angle (radians) at the node's true anomaly
function velocityAngle(node: ManeuverNode): number {
  const { a, e, omega } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const { vel } = stateFromOrbitalElements(a, e, omega, node.nu, mu);
  return Math.atan2(vel.y, vel.x);
}

// Return four handle endpoints (world-space Vec2) keyed by direction name.
// Handle length = HANDLE_BASE_LENGTH + |component| * HANDLE_DV_SCALE, scaled by zoom.
export function getHandlePositions(node: ManeuverNode, zoom?: number): HandlePositions {
  const origin = getNodeWorldPosition(node);
  const angle = velocityAngle(node);
  const z = zoom ?? 1;

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Scale handle length inversely with zoom so handles remain grabbable at map zoom
  const baseLen = HANDLE_BASE_LENGTH / z;
  const dvScale = HANDLE_DV_SCALE / z;

  const pgLen = baseLen + Math.abs(node.burnVector.prograde) * dvScale;
  // Normal/radial axis is perpendicular (90 deg CCW from prograde): (-sinA, cosA)
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

// Returns which handle is within grab radius of (worldX, worldY), or null if none.
export function hitTestHandles(
  node: ManeuverNode,
  worldX: number,
  worldY: number,
  handleLength?: number,
  zoom?: number,
): HandleName | null {
  const handles = getHandlePositions(node, zoom);
  const names: HandleName[] = ['prograde', 'retrograde', 'normal', 'radial'];
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

// Update the burn vector based on which handle is dragged and the world-space drag delta.
// prograde/retrograde control the prograde axis; normal/radial control the normal axis.
export function updateBurnFromDrag(
  node: ManeuverNode,
  handle: HandleName,
  dragDeltaWorld: Vec2,
): void {
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

// Compute post-burn state vector in SOI-relative coordinates.
// Returns the position and velocity immediately after the burn fires.
export interface PostBurnState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function getPostBurnState(node: ManeuverNode): PostBurnState {
  const { a, e, omega } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const { pos, vel } = stateFromOrbitalElements(a, e, omega, node.nu, mu);

  // Velocity direction at node (prograde angle)
  const angle = Math.atan2(vel.y, vel.x);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Rotate burn vector from orbital frame to world frame:
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
export function getManeuverDeltaV(node: ManeuverNode): number {
  return Math.sqrt(
    node.burnVector.prograde * node.burnVector.prograde +
    node.burnVector.normal * node.burnVector.normal,
  );
}
