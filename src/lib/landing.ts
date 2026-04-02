// Landing physics and state machine — pure, framework-agnostic logic.
// No Phaser imports. All functions are stateless and testable in isolation.

import type { Vec2, CelestialBody, PlanetBody, MoonBody } from '../types/index.js';
import { vec2Mag } from './utils.js';

// Landing state progression:
//   inactive  — ship is not in a landing sequence
//   approach  — ship is within approach threshold of a landable body
//   landed    — ship touched down successfully (descent rate was safe)
//   crashed   — ship struck the surface too fast (descent rate exceeded crash threshold)
//   crushed   — ship attempted to land on a gas giant (surface is non-solid)
//   ascending — ship is thrusting away from surface after approach was triggered
export type LandingState = 'inactive' | 'approach' | 'landed' | 'crashed' | 'crushed' | 'ascending';

// Telemetry snapshot computed each frame during a landing sequence
export interface LandingTelemetry {
  // Distance from ship center to body surface (game units)
  altitude: number;
  // Downward velocity component toward body center (positive = descending)
  descentRate: number;
  // Velocity component perpendicular to radial direction (positive = any lateral motion)
  horizontalVelocity: number;
  // Surface gravitational acceleration of the target body
  surfaceGravity: number;
  // True when the target body subtype is 'Gas Giant'
  isGasGiant: boolean;
  // Display name of the target body
  bodyName: string;
}

// Threshold constants governing landing outcome decisions.
// All velocity values are in game-units per second.
//
// KSP-SCALE REVIEW (performed during Feature 0006, Phase 1):
//
// APPROACH_FACTOR = 3:
//   At new scale, a 500 gu Rocky planet triggers approach at 1500 gu altitude (3× radius),
//   and a 2000 gu Gas Giant triggers at 6000 gu. This is proportionally the same as before —
//   the factor is scale-agnostic because it multiplies body.radius directly. No change needed.
//
// SAFE_DESCENT_RATE = 10, CRASH_DESCENT_RATE = 50:
//   Surface gravity = mu / radius².  At new KSP scale:
//     Rocky planet:  mu = G × 5_220_000 ≈ 5.22M.  g = 5.22M / 500² ≈ 20.9 gu/s².
//     Gas Giant:     mu = G × 104_400_000.         g = 104.4M / 2000² ≈ 26.1 gu/s².
//   These are higher surface gravities than the old arcade scale, but SAFE_DESCENT_RATE
//   and CRASH_DESCENT_RATE are approach/contact thresholds, not gravity-dependent parameters.
//   The ship physics (THRUST_POWER, etc.) will need separate tuning in a future phase;
//   these landing outcome thresholds remain reasonable as-is for the new scale.
export const LANDING_THRESHOLDS = {
  // Maximum descent rate for a successful landing
  SAFE_DESCENT_RATE: 10,
  // Maximum horizontal velocity for a successful landing
  SAFE_HORIZONTAL_VEL: 15,
  // Multiplier on body radius to compute the approach trigger distance.
  // Scale-agnostic: 3× radius works at both arcade and KSP scale.
  APPROACH_FACTOR: 3,
  // Multiplier on body radius to compute the gas-giant crush boundary
  CRUSH_FACTOR: 0.5,
  // Descent rate at or above which the ship is destroyed on impact
  CRASH_DESCENT_RATE: 50,
} as const;

// Type guard: returns true when body is a planet or moon (never star or anomaly)
export function isLandableBody(body: CelestialBody): body is PlanetBody | MoonBody {
  return body.kind === 'planet' || body.kind === 'moon';
}

// Compute a telemetry snapshot for the current frame.
//
// shipPos and shipVel must be expressed in the body-relative reference frame
// (i.e., body center is at the origin).
//
// surfaceGravity is approximated as mu / radius² using the body's gravitational
// parameter. For stars and anomalies this value will be present but landing
// is prevented upstream via isLandableBody.
export function calculateLandingTelemetry(
  shipPos: Vec2,
  shipVel: Vec2,
  body: CelestialBody,
): LandingTelemetry {
  const distance = vec2Mag(shipPos);
  const altitude = distance - body.radius;

  // Radial unit vector pointing from body center toward ship
  const radialX = distance > 0 ? shipPos.x / distance : 0;
  const radialY = distance > 0 ? shipPos.y / distance : 0;

  // Project velocity onto radial direction: positive value means moving away
  // from body, so negate to get descent rate (positive = descending)
  const radialVel = shipVel.x * radialX + shipVel.y * radialY;
  const descentRate = -radialVel;

  // Tangential velocity (perpendicular to radial) gives horizontal velocity
  const tangentialX = shipVel.x - radialVel * radialX;
  const tangentialY = shipVel.y - radialVel * radialY;
  const horizontalVelocity = Math.sqrt(tangentialX * tangentialX + tangentialY * tangentialY);

  // Approximate surface gravity from gravitational parameter when available
  const mu = 'mu' in body ? (body as { mu: number }).mu : 0;
  const surfaceGravity = body.radius > 0 ? mu / (body.radius * body.radius) : 0;

  const isGasGiant = body.subtype === 'Gas Giant';

  return {
    altitude,
    descentRate,
    horizontalVelocity,
    surfaceGravity,
    isGasGiant,
    bodyName: body.name,
  };
}

// Determine the next landing state given current telemetry and the current state.
//
// State transition rules:
//   inactive  → approach  : altitude < body.radius * APPROACH_FACTOR
//   approach  → crushed   : isGasGiant and altitude < body.radius * CRUSH_FACTOR
//   approach  → crashed   : altitude ≤ 0 and descentRate ≥ CRASH_DESCENT_RATE
//   approach  → landed    : altitude ≤ 0 and safe descent and safe horizontal
//   approach  → ascending : descentRate < 0 (moving away) and altitude > approach threshold
//   All terminal states (landed, crashed, crushed) are sticky — no outgoing transitions here.
//   ascending → inactive  : handled by the scene once altitude exceeds threshold
export function determineLandingOutcome(
  telemetry: LandingTelemetry,
  currentState: LandingState,
  body: CelestialBody,
): LandingState {
  // Terminal states — the scene controls what happens next
  if (
    currentState === 'landed' ||
    currentState === 'crashed' ||
    currentState === 'crushed'
  ) {
    return currentState;
  }

  const approachThreshold = body.radius * LANDING_THRESHOLDS.APPROACH_FACTOR;
  const crushThreshold = body.radius * LANDING_THRESHOLDS.CRUSH_FACTOR;

  if (currentState === 'inactive') {
    if (telemetry.altitude < approachThreshold) {
      return 'approach';
    }
    return 'inactive';
  }

  if (currentState === 'approach' || currentState === 'ascending') {
    // Gas giant crush zone — ship is pulled into the atmosphere
    if (telemetry.isGasGiant && telemetry.altitude < crushThreshold) {
      return 'crushed';
    }

    // Contact with surface
    if (telemetry.altitude <= 0) {
      if (telemetry.descentRate >= LANDING_THRESHOLDS.CRASH_DESCENT_RATE) {
        return 'crashed';
      }
      if (
        telemetry.descentRate <= LANDING_THRESHOLDS.SAFE_DESCENT_RATE &&
        telemetry.horizontalVelocity <= LANDING_THRESHOLDS.SAFE_HORIZONTAL_VEL
      ) {
        return 'landed';
      }
      // Between safe and crash threshold: also crash (not safe enough)
      return 'crashed';
    }

    // Ship is ascending away from the body
    if (telemetry.descentRate < 0 && telemetry.altitude >= approachThreshold) {
      return 'ascending';
    }

    return currentState === 'ascending' ? 'ascending' : 'approach';
  }

  return currentState;
}
