import { stateFromOrbitalElements } from './orbit.js';
import { getManeuverDeltaV } from './maneuver.js';

// Module-level burn guidance state
let activeNode = null;
let burnPhase = 'coast'; // 'coast' | 'align' | 'burn' | 'done'
let dvRemaining = 0;
let dvTotal = 0;
let prevSpeed = 0;

// Clear all module state
function clearState() {
  activeNode = null;
  burnPhase = 'coast';
  dvRemaining = 0;
  dvTotal = 0;
  prevSpeed = 0;
}

// Compute time-to-burn in seconds given ship's current orbital state vs node true anomaly
function computeTimeToBurn(ship, node) {
  const { a, e } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const n = Math.sqrt(mu / (a * a * a)); // mean motion

  const nuShip = ship.orbit ? ship.orbit.nu : 0;
  const nuNode = node.nu;

  // Convert true anomaly to mean anomaly
  function nuToM(nu) {
    const cosNu = Math.cos(nu);
    const E = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(nu), e + cosNu);
    return E - e * Math.sin(E);
  }

  const Mship = nuToM(nuShip);
  const Mnode = nuToM(nuNode);

  // Delta mean anomaly from ship to node (forward in orbit)
  let dM = Mnode - Mship;
  // Normalize to (-pi, pi] so we get signed time (negative = past the node)
  while (dM > Math.PI) dM -= 2 * Math.PI;
  while (dM < -Math.PI) dM += 2 * Math.PI;

  return dM / n;
}

// Called each frame. Returns guidance object or null if no nodes exist.
export function updateBurnGuide(ship, maneuverNodes, time, dt) {
  if (!maneuverNodes || maneuverNodes.length === 0) {
    clearState();
    return null;
  }

  const node = maneuverNodes[0];

  // Initialize state when node changes
  if (activeNode !== node) {
    activeNode = node;
    burnPhase = 'coast';
    dvTotal = getManeuverDeltaV(node);
    dvRemaining = dvTotal;
    prevSpeed = ship.getSpeed();
  }

  // Compute time to burn
  const timeToBurn = computeTimeToBurn(ship, node);

  // Phase transitions
  const absTime = Math.abs(timeToBurn);
  if (burnPhase === 'coast' && absTime <= 15) {
    burnPhase = 'align';
  }
  if (burnPhase === 'align' && absTime <= 2) {
    burnPhase = 'burn';
    prevSpeed = ship.getSpeed();
  }

  // Allow burn entry: if thrusting during coast or align phase
  if ((burnPhase === 'coast' || burnPhase === 'align') && ship.thrustActive) {
    burnPhase = 'burn';
    prevSpeed = ship.getSpeed();
  }

  // During burn: track delta-v consumption via speed change
  if (burnPhase === 'burn') {
    if (ship.thrustActive) {
      const currentSpeed = ship.getSpeed();
      const dv = Math.abs(currentSpeed - prevSpeed);
      dvRemaining = Math.max(0, dvRemaining - dv);
      prevSpeed = currentSpeed;
    } else {
      prevSpeed = ship.getSpeed();
    }

    // Burn complete
    if (dvRemaining <= 0) {
      burnPhase = 'done';
      maneuverNodes.splice(0, 1);
      clearState();
      return null;
    }
  }

  // Compute burn direction in world space from node's prograde/normal components
  const { a, e, omega } = node.orbitalElements;
  const mu = node.soiBody.mu;
  const { vel } = stateFromOrbitalElements(a, e, omega, node.nu, mu);

  const progradeMag = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  const progradeX = progradeMag > 0 ? vel.x / progradeMag : 1;
  const progradeY = progradeMag > 0 ? vel.y / progradeMag : 0;
  // Normal is 90 deg CCW from prograde
  const normalX = -progradeY;
  const normalY = progradeX;

  // Burn direction combines prograde and normal components
  const bx = node.burnVector.prograde * progradeX + node.burnVector.normal * normalX;
  const by = node.burnVector.prograde * progradeY + node.burnVector.normal * normalY;
  const bmag = Math.sqrt(bx * bx + by * by);
  const burnDirection = bmag > 0
    ? { x: bx / bmag, y: by / bmag }
    : { x: progradeX, y: progradeY };

  // Ship's current heading direction
  const shipDirX = Math.sin(ship.angle);
  const shipDirY = -Math.cos(ship.angle);

  // Dot product gives cos of angle between ship heading and burn direction
  const dot = shipDirX * burnDirection.x + shipDirY * burnDirection.y;
  const alignmentAngle = Math.acos(Math.max(-1, Math.min(1, dot)));

  return {
    phase: burnPhase,
    timeToBurn,
    dvRemaining,
    dvTotal,
    burnDirection,
    alignmentAngle,
  };
}

// Render a burn heading marker on the canvas
export function drawBurnGuide(ctx, camera, ship, guidance, zoom) {
  if (!guidance) return;

  zoom = zoom || 1;

  // Ship screen position
  const sx = (ship.x - camera.x) * zoom + ctx.canvas.width / 2;
  const sy = (ship.y - camera.y) * zoom + ctx.canvas.height / 2;

  const isAligned = guidance.alignmentAngle < 0.175; // ~10 degrees
  const arrowColor = isAligned ? '#4fc3f7' : '#ffeb3b';

  // Draw indicator ring around ship
  const ringRadius = 36;
  ctx.save();
  ctx.strokeStyle = isAligned ? 'rgba(79, 195, 247, 0.25)' : 'rgba(255, 235, 59, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Arrow tip position on ring edge in burn direction
  const { x: dx, y: dy } = guidance.burnDirection;
  const arrowX = sx + dx * ringRadius;
  const arrowY = sy + dy * ringRadius;

  // Angle of burn direction for chevron rotation
  const angle = Math.atan2(dy, dx);

  // Draw chevron arrow pointing in burn direction
  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angle);

  ctx.strokeStyle = arrowColor;
  ctx.fillStyle = arrowColor;
  ctx.lineWidth = 2;

  // Chevron shape: two angled lines pointing forward
  ctx.beginPath();
  ctx.moveTo(-8, -5);
  ctx.lineTo(0, 0);
  ctx.lineTo(-8, 5);
  ctx.stroke();

  // Second chevron slightly behind for depth
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(-14, -5);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-14, 5);
  ctx.stroke();

  ctx.restore();

  // Alignment arc: small arc showing how far ship heading is from burn direction
  const shipAngle = Math.atan2(guidance.burnDirection.y, guidance.burnDirection.x);
  const shipHeadingAngle = Math.atan2(
    -Math.cos(ship.angle),
    Math.sin(ship.angle)
  );

  ctx.strokeStyle = isAligned ? 'rgba(79, 195, 247, 0.6)' : 'rgba(255, 235, 59, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, ringRadius - 6, shipAngle, shipHeadingAngle, false);
  ctx.stroke();

  ctx.restore();
}
