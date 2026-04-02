import type {
  Vec2,
  ShipState,
  StarSystem,
  TrajectoryOptions,
  TrajectorySegment,
  TrajectoryMarker,
  MassiveBody,
  PlanetBody,
  MoonBody,
} from '../types/index.js';
import { gravityAcceleration, stateFromOrbitalElements, trueAnomalyAtTime } from './orbit.js';

// Distinct colors per SOI segment
const SOI_COLORS: readonly string[] = [
  'rgba(79, 195, 247, 0.5)',
  'rgba(255, 180, 50, 0.5)',
  'rgba(100, 255, 150, 0.5)',
  'rgba(255, 100, 200, 0.5)',
  'rgba(255, 120, 80, 0.5)',
  'rgba(180, 140, 255, 0.5)',
];

// Predict a body's world-space position at elapsed simulation time t
function predictBodyPosition(body: MassiveBody, simTime: number): Vec2 {
  if (body.kind === 'star') {
    return { x: 0, y: 0 };
  }

  if (body.kind === 'planet') {
    const { a, e, omega, nu0 } = body.orbitalElements;
    const mu = body.parentBody.mu;
    const nu = trueAnomalyAtTime(simTime, a, e, mu, nu0);
    const { pos } = stateFromOrbitalElements(a, e, omega, nu, mu);
    return { x: pos.x, y: pos.y };
  }

  // Moon: position is relative to parent planet
  const planet = body.parentBody;
  const planetPos = predictBodyPosition(planet, simTime);
  const { a, e, omega, nu0 } = body.orbitalElements;
  const mu = planet.mu;
  const nu = trueAnomalyAtTime(simTime, a, e, mu, nu0);
  const { pos: localPos } = stateFromOrbitalElements(a, e, omega, nu, mu);
  return { x: planetPos.x + localPos.x, y: planetPos.y + localPos.y };
}

// Predict a planet's orbital velocity at simulation time t
function predictPlanetVelocity(planet: PlanetBody, simTime: number): Vec2 {
  const { a, e, omega, nu0 } = planet.orbitalElements;
  const mu = planet.parentBody.mu;
  const nu = trueAnomalyAtTime(simTime, a, e, mu, nu0);
  const { vel } = stateFromOrbitalElements(a, e, omega, nu, mu);
  return { x: vel.x, y: vel.y };
}

// Predict a moon's orbital velocity relative to its parent planet at simulation time t
function predictMoonVelocity(moon: MoonBody, simTime: number): Vec2 {
  const planet = moon.parentBody;
  const { a, e, omega, nu0 } = moon.orbitalElements;
  const mu = planet.mu;
  const nu = trueAnomalyAtTime(simTime, a, e, mu, nu0);
  const { vel } = stateFromOrbitalElements(a, e, omega, nu, mu);
  return { x: vel.x, y: vel.y };
}

// Convert virtual ship's SOI-relative position to world-space
function virtualWorldPosition(vx: number, vy: number, soiBody: MassiveBody, simTime: number): Vec2 {
  if (soiBody.kind === 'star') {
    return { x: vx, y: vy };
  }
  const bodyPos = predictBodyPosition(soiBody, simTime);
  return { x: vx + bodyPos.x, y: vy + bodyPos.y };
}

// Propagate trajectory forward from the ship's current SOI-relative state.
// Returns array of segments: [{ points, soiBody, color, markers }, ...]
// shipState.pos is SOI-relative position, shipState.vel is SOI-relative velocity
export function propagateTrajectory(
  shipState: ShipState,
  system: StarSystem,
  options?: TrajectoryOptions,
): TrajectorySegment[] {
  const maxTime = options?.maxTime ?? 600;
  const baseStep = options?.stepSize ?? 1.0;
  const maxSegments = options?.maxSegments ?? 3;
  // simBaseTime is the game's current elapsed time, for predicting body positions
  const simBaseTime = options?.simBaseTime ?? 0;

  const segments: TrajectorySegment[] = [];

  // Virtual ship state (SOI-relative position and velocity)
  let px = shipState.pos.x;
  let py = shipState.pos.y;
  let pvx = shipState.vel.x;
  let pvy = shipState.vel.y;
  let currentSOIBody: MassiveBody = shipState.soiBody;

  let elapsedSim = 0;
  let segmentCount = 0;

  // Previous distance trackers for closest-approach detection: body.name -> dist
  let prevDistances: Record<string, number> = {};
  // Track best (minimum) closest approach per body per segment: body.name -> {dist, x, y, body}
  let bestApproach: Record<string, { dist: number; x: number; y: number; body: string }> = {};
  const MAX_CA_MARKERS = 1; // max closest-approach markers per segment

  // Start first segment
  let currentSegment: TrajectorySegment = {
    points: [],
    soiBody: currentSOIBody,
    color: SOI_COLORS[segmentCount % SOI_COLORS.length] ?? SOI_COLORS[0] ?? 'rgba(79, 195, 247, 0.5)',
    markers: [],
  };

  // Record the initial world-space point
  const initWorld = virtualWorldPosition(px, py, currentSOIBody, simBaseTime);
  currentSegment.points.push({ x: initWorld.x, y: initWorld.y });

  let pointCounter = 0; // throttle point recording for smoother lines

  while (elapsedSim < maxTime && segments.length < maxSegments + 1) {
    // Adaptive step size: smaller when close to SOI body center
    let dt = baseStep;
    const simTime = simBaseTime + elapsedSim;

    const rToParent = Math.sqrt(px * px + py * py);
    const parentRadius = currentSOIBody.radius ?? 10;
    if (rToParent < parentRadius * 4) {
      dt = baseStep * 0.25;
    } else if (rToParent < parentRadius * 8) {
      dt = baseStep * 0.5;
    }
    // Use larger steps when far from center (exit trajectories) for stability
    if (currentSOIBody.soiRadius !== undefined && rToParent > currentSOIBody.soiRadius * 0.7) {
      dt = baseStep * 2;
    }

    // Cap step so we don't overshoot total time
    dt = Math.min(dt, maxTime - elapsedSim);

    // Gravity acceleration from current SOI body (body is at origin in SOI-relative frame)
    const mu = ('mu' in currentSOIBody) ? currentSOIBody.mu : 0;
    let ax1 = 0;
    let ay1 = 0;
    if (mu > 0 && rToParent > 0) {
      const a1 = gravityAcceleration({ x: px, y: py }, { x: 0, y: 0 }, mu);
      ax1 = a1.x;
      ay1 = a1.y;
    }

    // Velocity-Verlet integration
    const newPx = px + pvx * dt + 0.5 * ax1 * dt * dt;
    const newPy = py + pvy * dt + 0.5 * ay1 * dt * dt;

    // New acceleration at new position
    const newR = Math.sqrt(newPx * newPx + newPy * newPy);
    let ax2 = 0;
    let ay2 = 0;
    if (mu > 0 && newR > 0) {
      const a2 = gravityAcceleration({ x: newPx, y: newPy }, { x: 0, y: 0 }, mu);
      ax2 = a2.x;
      ay2 = a2.y;
    }

    const newPvx = pvx + 0.5 * (ax1 + ax2) * dt;
    const newPvy = pvy + 0.5 * (ay1 + ay2) * dt;

    px = newPx;
    py = newPy;
    pvx = newPvx;
    pvy = newPvy;
    elapsedSim += dt;

    const newSimTime = simBaseTime + elapsedSim;

    // Check for SOI transitions (mirror checkSOITransition logic but non-mutating)
    let transitioned = false;

    if (currentSOIBody.kind === 'star') {
      // Star SOI: check if virtual ship enters any planet's SOI
      for (const planet of system.planets) {
        const planetPos = predictBodyPosition(planet, newSimTime);
        const dx = px - planetPos.x;
        const dy = py - planetPos.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < planet.soiRadius) {
          // Record exit marker on current segment at world position
          const exitWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
          const exitMarker: TrajectoryMarker = {
            type: 'soi-exit',
            x: exitWorldPos.x,
            y: exitWorldPos.y,
          };
          currentSegment.markers.push(exitMarker);

          // Flush best approaches into the current segment before pushing it
          flushClosestApproachMarkers(bestApproach, currentSegment, MAX_CA_MARKERS);

          // Finish current segment
          segments.push(currentSegment);
          segmentCount++;

          // Convert position to planet-relative frame
          px -= planetPos.x;
          py -= planetPos.y;

          // Convert velocity to planet-relative frame
          const planetVel = predictPlanetVelocity(planet, newSimTime);
          pvx -= planetVel.x;
          pvy -= planetVel.y;

          currentSOIBody = planet;

          // Start new segment
          currentSegment = {
            points: [],
            soiBody: currentSOIBody,
            color: SOI_COLORS[segmentCount % SOI_COLORS.length] ?? SOI_COLORS[0] ?? 'rgba(79, 195, 247, 0.5)',
            markers: [],
          };

          // Record entry marker on new segment
          const entryWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
          const entryMarker: TrajectoryMarker = {
            type: 'soi-entry',
            x: entryWorldPos.x,
            y: entryWorldPos.y,
          };
          currentSegment.markers.push(entryMarker);
          currentSegment.points.push({ x: entryWorldPos.x, y: entryWorldPos.y });

          prevDistances = {};
          bestApproach = {};
          transitioned = true;
          break;
        }
      }

    } else if (currentSOIBody.kind === 'planet') {
      const planet = currentSOIBody;
      const moons = planet.children;

      // Check moon entry before planet escape
      for (const moon of moons) {
        const moonWorldPos = predictBodyPosition(moon, newSimTime);
        const planetWorldPos = predictBodyPosition(planet, newSimTime);
        // Moon position relative to planet (we are in planet-relative frame)
        const moonLocalX = moonWorldPos.x - planetWorldPos.x;
        const moonLocalY = moonWorldPos.y - planetWorldPos.y;
        const dx = px - moonLocalX;
        const dy = py - moonLocalY;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < moon.soiRadius) {
          // Record exit marker on current segment
          const exitWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
          const exitMarker: TrajectoryMarker = {
            type: 'soi-exit',
            x: exitWorldPos.x,
            y: exitWorldPos.y,
          };
          currentSegment.markers.push(exitMarker);

          // Flush best approaches into the current segment before pushing it
          flushClosestApproachMarkers(bestApproach, currentSegment, MAX_CA_MARKERS);

          segments.push(currentSegment);
          segmentCount++;

          // Convert position to moon-relative frame
          px -= moonLocalX;
          py -= moonLocalY;

          // Convert velocity to moon-relative frame (moon vel is relative to planet)
          const moonVel = predictMoonVelocity(moon, newSimTime);
          pvx -= moonVel.x;
          pvy -= moonVel.y;

          currentSOIBody = moon;

          currentSegment = {
            points: [],
            soiBody: currentSOIBody,
            color: SOI_COLORS[segmentCount % SOI_COLORS.length] ?? SOI_COLORS[0] ?? 'rgba(79, 195, 247, 0.5)',
            markers: [],
          };

          const entryWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
          const entryMarker: TrajectoryMarker = {
            type: 'soi-entry',
            x: entryWorldPos.x,
            y: entryWorldPos.y,
          };
          currentSegment.markers.push(entryMarker);
          currentSegment.points.push({ x: entryWorldPos.x, y: entryWorldPos.y });

          prevDistances = {};
          bestApproach = {};
          transitioned = true;
          break;
        }
      }

      if (!transitioned) {
        // Check planet escape
        const distToParent = Math.sqrt(px * px + py * py);
        if (distToParent > planet.soiRadius) {
          const planetWorldPos = predictBodyPosition(planet, newSimTime);

          // Record exit marker
          const exitWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
          const exitMarker: TrajectoryMarker = {
            type: 'soi-exit',
            x: exitWorldPos.x,
            y: exitWorldPos.y,
          };
          currentSegment.markers.push(exitMarker);

          // Flush best approaches into the current segment before pushing it
          flushClosestApproachMarkers(bestApproach, currentSegment, MAX_CA_MARKERS);

          segments.push(currentSegment);
          segmentCount++;

          // Convert position back to star-relative frame
          px += planetWorldPos.x;
          py += planetWorldPos.y;

          // Convert velocity back to star-relative frame
          const planetVel = predictPlanetVelocity(planet, newSimTime);
          pvx += planetVel.x;
          pvy += planetVel.y;

          currentSOIBody = system.star;

          currentSegment = {
            points: [],
            soiBody: currentSOIBody,
            color: SOI_COLORS[segmentCount % SOI_COLORS.length] ?? SOI_COLORS[0] ?? 'rgba(79, 195, 247, 0.5)',
            markers: [],
          };

          const entryWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
          const entryMarker: TrajectoryMarker = {
            type: 'soi-entry',
            x: entryWorldPos.x,
            y: entryWorldPos.y,
          };
          currentSegment.markers.push(entryMarker);
          currentSegment.points.push({ x: entryWorldPos.x, y: entryWorldPos.y });

          prevDistances = {};
          bestApproach = {};
          transitioned = true;
        }
      }

    } else if (currentSOIBody.kind === 'moon') {
      const moon = currentSOIBody;
      const distToParent = Math.sqrt(px * px + py * py);

      if (distToParent > moon.soiRadius) {
        const planet = moon.parentBody;
        const moonWorldPos = predictBodyPosition(moon, newSimTime);
        const planetWorldPos = predictBodyPosition(planet, newSimTime);

        // Moon position relative to planet
        const moonLocalX = moonWorldPos.x - planetWorldPos.x;
        const moonLocalY = moonWorldPos.y - planetWorldPos.y;

        // Record exit marker
        const exitWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
        const exitMarker: TrajectoryMarker = {
          type: 'soi-exit',
          x: exitWorldPos.x,
          y: exitWorldPos.y,
        };
        currentSegment.markers.push(exitMarker);

        segments.push(currentSegment);
        segmentCount++;

        // Convert position back to planet-relative frame
        px += moonLocalX;
        py += moonLocalY;

        // Convert velocity back to planet-relative frame
        const moonVel = predictMoonVelocity(moon, newSimTime);
        pvx += moonVel.x;
        pvy += moonVel.y;

        currentSOIBody = planet;

        currentSegment = {
          points: [],
          soiBody: currentSOIBody,
          color: SOI_COLORS[segmentCount % SOI_COLORS.length] ?? SOI_COLORS[0] ?? 'rgba(79, 195, 247, 0.5)',
          markers: [],
        };

        const entryWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
        const entryMarker: TrajectoryMarker = {
          type: 'soi-entry',
          x: entryWorldPos.x,
          y: entryWorldPos.y,
        };
        currentSegment.markers.push(entryMarker);
        currentSegment.points.push({ x: entryWorldPos.x, y: entryWorldPos.y });

        prevDistances = {};
        transitioned = true;
      }
    }

    // Add current world-space point to segment (skip if we just transitioned — already added entry)
    // Throttle point density: record every 3rd point to smooth out jitter
    pointCounter++;
    if (!transitioned && pointCounter % 3 === 0) {
      const worldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
      currentSegment.points.push({ x: worldPos.x, y: worldPos.y });
    }

    // Closest approach tracking — check all bodies except current SOI body
    // Only track the single best approach per body, flushed at segment end
    for (const body of system.bodies) {
      if (body === currentSOIBody) continue;
      if (body.kind === 'anomaly') continue;

      const bodyWorldPos = predictBodyPosition(body as MassiveBody, newSimTime);
      const shipWorldPos = virtualWorldPosition(px, py, currentSOIBody, newSimTime);
      const dx = shipWorldPos.x - bodyWorldPos.x;
      const dy = shipWorldPos.y - bodyWorldPos.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      // Skip bodies that are very far (> 3x their SOI radius) to reduce noise
      if (body.soiRadius !== undefined && d > body.soiRadius * 3) {
        prevDistances[body.name] = d;
        continue;
      }

      const prev = prevDistances[body.name];
      if (prev != null && d > prev) {
        // Local minimum passed — record if it's the best approach for this body
        const existing = bestApproach[body.name];
        if (existing === undefined || prev < existing.dist) {
          bestApproach[body.name] = {
            dist: prev,
            x: shipWorldPos.x,
            y: shipWorldPos.y,
            body: body.name,
          };
        }
        delete prevDistances[body.name];
      } else {
        prevDistances[body.name] = d;
      }
    }

    // Stop if we have exceeded the segment limit
    if (segments.length >= maxSegments + 1) break;
  }

  // Flush best closest-approach markers into the current segment
  flushClosestApproachMarkers(bestApproach, currentSegment, MAX_CA_MARKERS);

  // Push the last open segment if it has points
  if (currentSegment.points.length > 1) {
    segments.push(currentSegment);
  }

  return segments;
}

// Helper: flush closest-approach entries into a segment's markers array
function flushClosestApproachMarkers(
  bestApproach: Record<string, { dist: number; x: number; y: number; body: string }>,
  segment: TrajectorySegment,
  maxMarkers: number,
): void {
  const approaches = Object.values(bestApproach)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxMarkers);
  for (const ca of approaches) {
    const marker: TrajectoryMarker = {
      type: 'closest-approach',
      x: ca.x,
      y: ca.y,
      body: ca.body,
      distance: Math.round(ca.dist),
    };
    segment.markers.push(marker);
  }
}
