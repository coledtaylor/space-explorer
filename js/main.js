import { Ship } from './ship.js';
import { Input } from './input.js';
import { Starfield } from './starfield.js';
import { generateSystem, updateBodyPositions } from './celestial.js';
import { drawBody, drawMinimap, setCameraHack, drawOrbitPath, drawBodyOrbits, drawTrajectory, drawManeuverNode, drawPostBurnTrajectory, drawSurfaceHorizon, drawCrashEffect } from './renderer.js';
import { propagateTrajectory } from './trajectory.js';
import { checkSOITransition, shipWorldPosition } from './physics.js';
import { dist, lerp } from './utils.js';
import { MapMode } from './mapmode.js';
import { getWarpRate, increaseWarp, decreaseWarp, resetWarp } from './timewarp.js';
import { updateLanding, getLandingState, resetLanding } from './landing.js';
import { updateBurnGuide, drawBurnGuide } from './burnguide.js';
import { showSurfacePanel, hideSurfacePanel, getScience } from './surface.js';
import {
  createManeuverNode,
  getNodeWorldPosition,
  getHandlePositions,
  hitTestHandles,
  updateBurnFromDrag,
  getPostBurnState,
  getManeuverDeltaV,
  maneuverNodes,
} from './maneuver.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

// UI elements
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const scanPanel = document.getElementById('scan-panel');
const scanClose = document.getElementById('scan-close');
const scanName = document.getElementById('scan-name');
const scanType = document.getElementById('scan-type');
const scanDesc = document.getElementById('scan-desc');
const scanDetails = document.getElementById('scan-details');
const scanMass = document.getElementById('scan-mass');
const scanRadius = document.getElementById('scan-radius');
const scanSoiRadius = document.getElementById('scan-soi-radius');
const scanPeriod = document.getElementById('scan-period');
const scanSma = document.getElementById('scan-sma');
const scanEcc = document.getElementById('scan-ecc');
const locationDisplay = document.getElementById('location-display');
const mapIndicator = document.getElementById('map-indicator');
const coordsDisplay = document.getElementById('coords-display');
const fuelDisplay = document.getElementById('fuel-display');
const speedDisplay = document.getElementById('speed-display');
const warpDisplay = document.getElementById('warp-display');
const hud = document.getElementById('hud');
const minimap = document.getElementById('minimap');
const orbitHud = document.getElementById('orbit-hud');
const maneuverInfo = document.getElementById('maneuver-info');
const maneuverDvDisplay = document.getElementById('maneuver-dv');

// Burn guidance HUD elements
const burnGuideEl = document.getElementById('burn-guide');
const burnCountdown = document.getElementById('burn-countdown');
const burnDvRemaining = document.getElementById('burn-dv-remaining');
const burnStatus = document.getElementById('burn-status');

// Science display
const scienceDisplay = document.getElementById('science-display');

// Landing HUD elements
const landingHud = document.getElementById('landing-hud');
const landingAlt = document.getElementById('landing-alt');
const landingVs = document.getElementById('landing-vs');
const landingHs = document.getElementById('landing-hs');
const landingStatus = document.getElementById('landing-status');

// Orbital HUD elements
const altDisplay = document.getElementById('alt-display');
const velDisplay = document.getElementById('vel-display');
const apDisplay = document.getElementById('ap-display');
const peDisplay = document.getElementById('pe-display');
const periodDisplay = document.getElementById('period-display');
const eccDisplay = document.getElementById('ecc-display');
const soiDisplay = document.getElementById('soi-display');

let running = false;
let time = 0;
let prevMapState = false;
let burnGuidance = null;
let wasLanded = false;

// Landing zoom state
let landingZoom = 1.0;
const LANDING_ZOOM_MAX = 10;
const LANDING_APPROACH_FACTOR = 3; // mirrors landing.js APPROACH_FACTOR

// Crash effect state
let crashEffect = null;

// Maneuver node drag state
let activeManeuverHandle = null;
let prevDragX = 0;
let prevDragY = 0;

const input = new Input(canvas);
const starfield = new Starfield();
const camera = { x: 0, y: 0 };
const mapMode = new MapMode();

// Generate a starting system
let currentSystemSeed = 42;
let system = generateSystem(currentSystemSeed);

// Place ship in a circular orbit around the star
const ship = new Ship();
const INITIAL_ORBIT_RADIUS = 500;
ship.x = INITIAL_ORBIT_RADIUS;
ship.y = 0;
ship.vx = 0;
ship.vy = -Math.sqrt(system.star.mu / INITIAL_ORBIT_RADIUS);
ship.currentSOIBody = system.star;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Start game
startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  hud.style.display = '';
  minimap.style.display = '';
  orbitHud.style.display = '';
  running = true;
  requestAnimationFrame(loop);
});

scanClose.addEventListener('click', () => {
  scanPanel.classList.add('hidden');
});

// Hide HUD initially
hud.style.display = 'none';
minimap.style.display = 'none';
orbitHud.style.display = 'none';

let lastTime = 0;

function loop(timestamp) {
  if (!running) return;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Consume warp key presses once per frame (before sub-stepping)
  if (input.consumeWarpUp()) increaseWarp();
  if (input.consumeWarpDown()) decreaseWarp();
  if (input.consumeClearNode()) maneuverNodes.length = 0;

  // Compute effective dt with warp and divide into stable sub-steps
  const warpRate = getWarpRate();
  const effectiveDt = dt * warpRate;
  const MAX_SUB_DT = 0.05;
  const steps = Math.ceil(effectiveDt / MAX_SUB_DT);
  const subDt = effectiveDt / steps;

  for (let i = 0; i < steps; i++) {
    time += subDt;
    updateBodyPositions(system, subDt);
    ship.update(subDt, input, ship.currentSOIBody);

    // Auto-drop warp on thrust
    if (ship.thrustActive) resetWarp();

    // Landing update — runs after ship physics, before SOI transition
    updateLanding(ship, subDt);

    // SOI transition check — skip when landed (ship is stationary on surface)
    if (!ship.landed) {
      const transition = checkSOITransition(ship, system);
      if (transition) resetWarp();
    }
  }

  // Update warp HUD
  const currentWarpRate = getWarpRate();
  if (currentWarpRate > 1) {
    warpDisplay.textContent = 'WARP ' + currentWarpRate + 'x';
    warpDisplay.classList.remove('hidden');
  } else {
    warpDisplay.classList.add('hidden');
  }

  update(dt);
  render();

  requestAnimationFrame(loop);
}

function update(dt) {
  // Map mode toggle — detect edge on input.map
  const prevMapActive = mapMode.isActive();
  if (input.map !== prevMapState) {
    prevMapState = input.map;
    mapMode.toggle();
  }
  mapMode.update(dt, ship, system, canvas, camera);

  // Update map indicator visibility
  if (mapIndicator) {
    if (mapMode.isActive()) {
      mapIndicator.classList.remove('hidden');
    } else {
      mapIndicator.classList.add('hidden');
    }
  }

  // Surface panel — detect landed state transitions
  const isNowLanded = ship.landed === true;
  const landedBody = getLandingState().body || ship.currentSOIBody;
  if (isNowLanded && !wasLanded) {
    showSurfacePanel(landedBody, currentSystemSeed);
  } else if (!isNowLanded && wasLanded) {
    hideSurfacePanel();
  }
  wasLanded = isNowLanded;

  // Hide surface panel when entering map mode; restore when leaving (if still landed)
  if (!prevMapActive && mapMode.isActive()) {
    hideSurfacePanel();
  } else if (prevMapActive && !mapMode.isActive() && isNowLanded) {
    showSurfacePanel(landedBody, currentSystemSeed);
  }

  // Update science counter each frame
  if (scienceDisplay) {
    scienceDisplay.textContent = 'Science: ' + getScience();
  }

  // Recompute world position after possible transition
  const wp = shipWorldPosition(ship, system);

  // Landing zoom — compute target zoom from altitude, lerp toward it each frame
  const ls0 = getLandingState();
  let targetLandingZoom = 1.0;
  if (!mapMode.isActive() && ls0.body && (ls0.state === 'approach' || ls0.state === 'landed')) {
    const approachThreshold = ls0.body.radius * LANDING_APPROACH_FACTOR;
    const altitude = Math.max(0, ls0.altitude);
    // Inverse-altitude curve: zooms in sharply as altitude approaches 0
    const t = 1 - Math.min(1, altitude / approachThreshold);
    // Exponential curve: t^2 gives more zoom near surface, less during early approach
    targetLandingZoom = 1.0 + (LANDING_ZOOM_MAX - 1.0) * (t * t);
  }
  landingZoom = lerp(landingZoom, targetLandingZoom, 0.04);

  // Tighten camera lerp when zoomed in during landing so ship stays centered
  const cameraLerp = landingZoom > 2 ? 0.25 : 0.08;
  // Camera follows ship world-space position smoothly
  camera.x += (wp.x - camera.x) * cameraLerp;
  camera.y += (wp.y - camera.y) * cameraLerp;

  // Point ship at mouse only in flight mode — skip in map mode to avoid spinning
  if (!mapMode.isActive()) {
    // Mouse is stored in clientX/Y (CSS viewport pixels). For a full-screen canvas at
    // (0,0) with no CSS scaling the canvas pixel grid equals the viewport CSS pixel grid,
    // so no conversion is needed.
    const shipScreenX = wp.x - camera.x + canvas.width / 2;
    const shipScreenY = wp.y - camera.y + canvas.height / 2;
    ship.angle = Math.atan2(input.mouseY - shipScreenY, input.mouseX - shipScreenX) + Math.PI / 2;
  }

  // HUD
  coordsDisplay.textContent = `x: ${Math.round(wp.x)}  y: ${Math.round(wp.y)}`;
  fuelDisplay.textContent = `Fuel: ${Math.round(ship.fuel)}%`;
  speedDisplay.textContent = `Speed: ${ship.getSpeed().toFixed(1)}`;

  // SOI body name on location display
  const soiName = ship.currentSOIBody ? ship.currentSOIBody.name : 'Unknown';
  locationDisplay.textContent = `SOI: ${soiName}`;

  // Orbital HUD
  const orbit = ship.orbit;
  altDisplay.textContent = Math.round(orbit.altitude);
  velDisplay.textContent = ship.getSpeed().toFixed(1);
  eccDisplay.textContent = orbit.e.toFixed(3);
  soiDisplay.textContent = soiName;

  if (orbit.e < 1) {
    apDisplay.textContent = Math.round(orbit.apoapsis);
    peDisplay.textContent = Math.round(orbit.periapsis);
    periodDisplay.textContent = Math.round(orbit.T);
  } else {
    apDisplay.textContent = '\u221e';
    peDisplay.textContent = Math.round(orbit.periapsis);
    periodDisplay.textContent = '\u221e';
  }

  // Burn guidance — only active in flight mode
  if (!mapMode.isActive()) {
    burnGuidance = updateBurnGuide(ship, maneuverNodes, time, dt);
  } else {
    burnGuidance = null;
  }

  if (burnGuidance) {
    burnGuideEl.classList.remove('hidden');

    // Format T-BURN countdown
    const t = burnGuidance.timeToBurn;
    let countdownText;
    if (t < 10) {
      countdownText = t.toFixed(1) + 's';
    } else {
      const mins = Math.floor(t / 60);
      const secs = Math.floor(t % 60);
      countdownText = mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
    burnCountdown.textContent = countdownText;

    // dV remaining
    burnDvRemaining.textContent = burnGuidance.dvRemaining.toFixed(1);

    // Status text and class
    const phase = burnGuidance.phase;
    burnStatus.textContent = phase.toUpperCase();
    burnStatus.className = 'status-' + phase;

    // Active glow when burning
    if (phase === 'burn') {
      burnGuideEl.classList.add('burn-active');
    } else {
      burnGuideEl.classList.remove('burn-active');
    }
  } else {
    burnGuideEl.classList.add('hidden');
    burnGuideEl.classList.remove('burn-active');
  }

  // Landing HUD — read state and update display each frame
  const ls = getLandingState();
  if (ls.state === 'approach') {
    landingHud.classList.remove('hidden');

    // Altitude
    landingAlt.textContent = Math.max(0, Math.round(ls.altitude));
    landingAlt.className = '';

    // Vertical speed — color-code by danger level
    const vsVal = ls.descentRate;
    landingVs.textContent = vsVal.toFixed(1);
    if (vsVal > 0.9 * 3) {
      landingVs.className = 'danger';
    } else if (vsVal > 0.6 * 3) {
      landingVs.className = 'warn';
    } else {
      landingVs.className = '';
    }

    // Horizontal speed — color-code by danger level
    const hsVal = ls.horizontalVelocity;
    landingHs.textContent = hsVal.toFixed(1);
    if (hsVal > 0.9 * 4) {
      landingHs.className = 'danger';
    } else if (hsVal > 0.6 * 4) {
      landingHs.className = 'warn';
    } else {
      landingHs.className = '';
    }

    // Status text — DANGER if any value is in warn/danger zone
    const inDanger = vsVal > 0.6 * 3 || hsVal > 0.6 * 4;
    if (ls.isGasGiant) {
      landingStatus.textContent = 'ATMOSPHERE';
      landingStatus.className = 'status-danger';
    } else if (inDanger) {
      landingStatus.textContent = 'DANGER';
      landingStatus.className = 'status-danger';
    } else {
      landingStatus.textContent = 'NOMINAL';
      landingStatus.className = 'status-nominal';
    }
  } else if (ls.state === 'landed') {
    landingHud.classList.remove('hidden');
    landingAlt.textContent = '0';
    landingAlt.className = '';
    landingVs.textContent = '0.0';
    landingVs.className = '';
    landingHs.textContent = '0.0';
    landingHs.className = '';
    landingStatus.textContent = 'LANDED';
    landingStatus.className = 'status-landed';
  } else if (ls.state === 'crashed') {
    // Start crash effect at the ship's world position before respawn
    if (!crashEffect) {
      const crashWx = wp.x;
      const crashWy = wp.y;
      const CRASH_DURATION = 1.0;
      const particles = [];
      const PARTICLE_COUNT = 24;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 8 + Math.random() * 18;
        particles.push({
          x: crashWx,
          y: crashWy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3 + Math.random() * 5,
          life: 1.0,
          maxLife: 1.0,
        });
      }
      crashEffect = { active: true, timer: CRASH_DURATION, duration: CRASH_DURATION, x: crashWx, y: crashWy, particles };
    }

    // Respawn in circular orbit around the crashed body
    const body = ls.body;
    if (body) {
      const orbitRadius = body.radius * 4;
      ship.x = orbitRadius;
      ship.y = 0;
      ship.vx = 0;
      ship.vy = -Math.sqrt(body.mu / orbitRadius);
      ship.landed = false;
    }
    resetLanding();
    // Brief crash message then hide
    landingHud.classList.remove('hidden');
    landingAlt.textContent = '0';
    landingAlt.className = 'danger';
    landingVs.textContent = '—';
    landingVs.className = 'danger';
    landingHs.textContent = '—';
    landingHs.className = 'danger';
    landingStatus.textContent = 'CRASH';
    landingStatus.className = 'status-crash';
    setTimeout(() => landingHud.classList.add('hidden'), 2000);
  } else if (ls.state === 'crushed') {
    // Respawn in circular orbit around the parent star
    ship.currentSOIBody = system.star;
    // Place ship at gas giant world position offset from star, then circular orbit around star
    const crushBody = ls.body;
    if (crushBody) {
      const orbitRadius = Math.sqrt(crushBody.x * crushBody.x + crushBody.y * crushBody.y);
      ship.x = orbitRadius;
      ship.y = 0;
      ship.vx = 0;
      ship.vy = -Math.sqrt(system.star.mu / orbitRadius);
    } else {
      ship.x = INITIAL_ORBIT_RADIUS;
      ship.y = 0;
      ship.vx = 0;
      ship.vy = -Math.sqrt(system.star.mu / INITIAL_ORBIT_RADIUS);
    }
    ship.landed = false;
    resetLanding();
    // Brief crush message then hide
    landingHud.classList.remove('hidden');
    landingAlt.textContent = '0';
    landingAlt.className = 'danger';
    landingVs.textContent = '—';
    landingVs.className = 'danger';
    landingHs.textContent = '—';
    landingHs.className = 'danger';
    landingStatus.textContent = 'ATMO CRUSH';
    landingStatus.className = 'status-crush';
    setTimeout(() => landingHud.classList.add('hidden'), 2000);
  } else {
    // inactive
    landingHud.classList.add('hidden');
  }

  // Tick crash effect particles
  if (crashEffect && crashEffect.active) {
    crashEffect.timer -= dt;
    if (crashEffect.timer <= 0) {
      crashEffect = null;
    } else {
      for (const p of crashEffect.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life = crashEffect.timer / crashEffect.duration;
      }
    }
  }

  // Find nearest body for scan interaction (use world-space distances)
  let nearest = null;
  let nearestDist = Infinity;
  for (const body of system.bodies) {
    const d = dist(wp.x, wp.y, body.x, body.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = body;
    }
  }

  // Click to scan — only in flight mode (map mode disables clicks to avoid mis-scans at zoom)
  const click = input.consumeClick();
  if (click && !mapMode.isActive()) {
    for (const body of system.bodies) {
      const bsx = body.x - camera.x + canvas.width / 2;
      const bsy = body.y - camera.y + canvas.height / 2;
      if (dist(click.x, click.y, bsx, bsy) < body.radius + 20) {
        showScan(body);
        break;
      }
    }
  }

  // Map mode maneuver node interaction
  if (mapMode.isActive()) {
    const zoom = mapMode.getZoom();
    const mapCam = mapMode.getCamera();

    // Handle drag for maneuver node handles
    const dragState = input.getDragState();
    if (dragState.dragging && activeManeuverHandle && maneuverNodes[0]) {
      // Convert pixel delta to world-space delta
      const dx = (dragState.x - prevDragX) / zoom;
      const dy = (dragState.y - prevDragY) / zoom;
      updateBurnFromDrag(maneuverNodes[0], activeManeuverHandle, { x: dx, y: dy });
      prevDragX = dragState.x;
      prevDragY = dragState.y;
    }

    // Detect drag start — check if we grab a handle
    const dragStart = input.consumeDragStart();
    if (dragStart && maneuverNodes[0]) {
      // Convert screen click to world coords
      const worldX = (dragStart.x - canvas.width / 2) / zoom + mapCam.x;
      const worldY = (dragStart.y - canvas.height / 2) / zoom + mapCam.y;
      const hitRadius = 20 / zoom;
      const hitHandle = hitTestHandles(maneuverNodes[0], worldX, worldY, hitRadius, zoom);
      if (hitHandle) {
        activeManeuverHandle = hitHandle;
        prevDragX = dragStart.x;
        prevDragY = dragStart.y;
      } else {
        // Check if clicking near the node center — default to prograde
        const nodePos = getNodeWorldPosition(maneuverNodes[0]);
        const dxn = worldX - nodePos.x;
        const dyn = worldY - nodePos.y;
        const distToNode = Math.sqrt(dxn * dxn + dyn * dyn);
        if (distToNode < 30 / zoom) {
          activeManeuverHandle = 'prograde';
          prevDragX = dragStart.x;
          prevDragY = dragStart.y;
        } else {
          activeManeuverHandle = null;
        }
      }
    }

    // Detect drag end
    if (input.consumeDragEnd()) {
      activeManeuverHandle = null;
    }

    // Click (not drag) — place maneuver node on orbit path
    if (click && !activeManeuverHandle) {
      // Convert click to world coords
      const worldX = (click.x - canvas.width / 2) / zoom + mapCam.x;
      const worldY = (click.y - canvas.height / 2) / zoom + mapCam.y;

      // Hit-test against orbit ellipse points
      const orbit = ship.orbit;
      const soiBody = ship.currentSOIBody;
      if (orbit && soiBody && orbit.e < 1) {
        const { a, e, omega } = orbit;
        const bodyX = soiBody.x || 0;
        const bodyY = soiBody.y || 0;
        const cosO = Math.cos(omega);
        const sinO = Math.sin(omega);
        const b = a * Math.sqrt(1 - e * e);
        const c = a * e;

        const steps = 100;
        let bestDist = Infinity;
        let bestNu = 0;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const xE = a * Math.cos(theta) - c;
          const yE = b * Math.sin(theta);
          const wx = bodyX + cosO * xE - sinO * yE;
          const wy = bodyY + sinO * xE + cosO * yE;
          const d = dist(worldX, worldY, wx, wy);
          if (d < bestDist) {
            bestDist = d;
            const cosTheta = (xE + c) / a;
            const sinTheta = yE / b;
            const E = Math.atan2(sinTheta, cosTheta);
            bestNu = 2 * Math.atan2(
              Math.sqrt(1 + e) * Math.sin(E / 2),
              Math.sqrt(1 - e) * Math.cos(E / 2)
            );
          }
        }

        const clickThreshold = 30 / zoom;
        if (bestDist <= clickThreshold) {
          const node = createManeuverNode(bestNu, orbit, soiBody);
          maneuverNodes[0] = node;
          maneuverNodes.length = 1;
        }
      }
    }

    // Update maneuver info panel
    if (maneuverNodes[0]) {
      const dv = getManeuverDeltaV(maneuverNodes[0]);
      if (maneuverDvDisplay) maneuverDvDisplay.textContent = dv.toFixed(1) + ' m/s';
      if (maneuverInfo) maneuverInfo.classList.remove('hidden');
    } else {
      if (maneuverInfo) maneuverInfo.classList.add('hidden');
    }
  } else {
    // Not in map mode — hide maneuver panel, clear active handle
    if (maneuverInfo) maneuverInfo.classList.add('hidden');
    activeManeuverHandle = null;
  }

  // Interact with nearest body
  if (input.consumeInteract() && nearest && nearestDist < nearest.radius + 60) {
    showScan(nearest);
  }

  // Fuel regeneration near stars (compare world-space distances)
  for (const body of system.bodies) {
    if (body.kind === 'star') {
      const d = dist(wp.x, wp.y, body.x, body.y);
      if (d < body.radius * 4 && d > body.radius) {
        ship.fuel = Math.min(100, ship.fuel + dt * 5);
        fuelDisplay.style.color = '#66ff66';
        setTimeout(() => fuelDisplay.style.color = '#4fc3f7', 200);
      }
    }
  }

  // System transition — use world-space distance from star (origin)
  if (dist(wp.x, wp.y, 0, 0) > 4000) {
    currentSystemSeed += 1;
    system = generateSystem(currentSystemSeed);
    ship.currentSOIBody = system.star;
    ship.x = INITIAL_ORBIT_RADIUS;
    ship.y = 0;
    ship.vx = 0;
    ship.vy = -Math.sqrt(system.star.mu / INITIAL_ORBIT_RADIUS);
    camera.x = ship.x;
    camera.y = ship.y;
    scanPanel.classList.add('hidden');
    hideSurfacePanel();
    wasLanded = false;
    resetLanding();
    crashEffect = null;
    landingZoom = 1.0;
  }
}

function showScan(body) {
  scanName.textContent = body.name;
  scanType.textContent = body.subtype || body.kind;
  scanDesc.textContent = body.description;

  // Populate scan-details with kind-specific entries
  scanDetails.innerHTML = '';
  if (body.kind === 'star' && body.details) {
    for (const [key, val] of Object.entries(body.details)) {
      const line = document.createElement('div');
      line.textContent = `${key}: ${val}`;
      scanDetails.appendChild(line);
    }
  } else if (body.kind === 'anomaly' && body.details) {
    for (const [key, val] of Object.entries(body.details)) {
      const line = document.createElement('div');
      line.textContent = `${key}: ${val}`;
      scanDetails.appendChild(line);
    }
  }

  // Populate orbital data fields
  scanMass.textContent = body.mass !== undefined ? body.mass.toFixed(0) + ' kg' : '—';
  scanRadius.textContent = body.radius !== undefined ? body.radius.toFixed(1) + ' km' : '—';

  if (body.kind === 'star') {
    scanSoiRadius.textContent = '—';
    scanPeriod.textContent = '—';
    scanSma.textContent = '—';
    scanEcc.textContent = '—';
  } else if (body.orbitalElements) {
    const { a, e } = body.orbitalElements;
    const muParent = body.parentBody.mu;
    const T = 2 * Math.PI * Math.sqrt(a * a * a / muParent);

    scanSoiRadius.textContent = body.soiRadius !== undefined ? body.soiRadius.toFixed(1) + ' km' : '—';
    scanPeriod.textContent = T.toFixed(1) + ' s';
    scanSma.textContent = a.toFixed(1) + ' km';
    scanEcc.textContent = e.toFixed(4);
  } else {
    scanSoiRadius.textContent = '—';
    scanPeriod.textContent = '—';
    scanSma.textContent = '—';
    scanEcc.textContent = '—';
  }

  scanPanel.classList.remove('hidden');
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#010108';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Starfield draws before zoom transform — it is a parallax background, not a world object
  starfield.draw(ctx, camera, time);

  // Determine effective camera and zoom from map mode
  const mapZoom = mapMode.getZoom();
  const mapCam = mapMode.getCamera();
  const usingMapCam = mapMode.isActive();

  // Apply landing zoom when in flight mode; map mode has its own zoom
  const zoom = usingMapCam ? mapZoom : landingZoom;

  // Screen shake during crash effect — offset camera by decreasing random amount
  let shakeX = 0, shakeY = 0;
  if (crashEffect && crashEffect.active) {
    const shakeIntensity = (crashEffect.timer / crashEffect.duration) * 6;
    shakeX = (Math.random() * 2 - 1) * shakeIntensity;
    shakeY = (Math.random() * 2 - 1) * shakeIntensity;
  }

  const effectiveCam = usingMapCam
    ? mapCam
    : { x: camera.x + shakeX, y: camera.y + shakeY };

  setCameraHack(effectiveCam.x, effectiveCam.y);

  // Draw bodies (stars first, then planets, then anomalies)
  const sorted = [...system.bodies].sort((a, b) => {
    const order = { star: 0, planet: 1, moon: 2, anomaly: 3 };
    return (order[a.kind] || 0) - (order[b.kind] || 0);
  });
  for (const body of sorted) {
    drawBody(ctx, body, effectiveCam, time, zoom);
  }

  // Draw body orbit paths (behind ship orbit)
  drawBodyOrbits(ctx, system.bodies, effectiveCam, zoom);

  // Draw ship's predicted orbit path
  drawOrbitPath(ctx, effectiveCam, ship.orbit, ship.currentSOIBody, zoom);

  // Draw trajectory prediction
  const trajectorySegments = propagateTrajectory(
    { x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, currentSOIBody: ship.currentSOIBody },
    system,
    { maxTime: 600, stepSize: 0.25, maxSegments: 3, simBaseTime: time }
  );
  drawTrajectory(ctx, effectiveCam, trajectorySegments, zoom);

  // Surface horizon — draw when close to a body (zoom > 3) in flight mode
  if (!usingMapCam && zoom > 3) {
    const lsRender = getLandingState();
    if (lsRender.body) {
      drawSurfaceHorizon(ctx, lsRender.body, effectiveCam, zoom);
    }
  }

  // Draw ship at world-space screen position
  const wp = shipWorldPosition(ship, system);
  ship.draw(ctx, effectiveCam, wp, zoom);

  // Draw burn heading marker in flight mode
  if (!mapMode.isActive() && burnGuidance) {
    drawBurnGuide(ctx, effectiveCam, ship, burnGuidance, zoom);
  }

  // Draw maneuver nodes and post-burn trajectory in map mode
  if (mapMode.isActive() && maneuverNodes[0]) {
    const node = maneuverNodes[0];
    // getNodeWorldPosition and getHandlePositions already include the soiBody world offset
    node.worldPos = getNodeWorldPosition(node);
    node.handlePositions = getHandlePositions(node, zoom);
    const dv = getManeuverDeltaV(node);
    node.dvLabel = dv.toFixed(1) + ' m/s';

    drawManeuverNode(ctx, effectiveCam, node, activeManeuverHandle, zoom);

    // Post-burn trajectory: getPostBurnState returns SOI-relative pos/vel
    // propagateTrajectory also expects SOI-relative coords, so pass directly
    const postBurnState = getPostBurnState(node);
    const postBurnWorldState = {
      x: postBurnState.x,
      y: postBurnState.y,
      vx: postBurnState.vx,
      vy: postBurnState.vy,
      currentSOIBody: node.soiBody,
    };
    const postBurnSegments = propagateTrajectory(
      postBurnWorldState,
      system,
      { maxTime: 600, maxSegments: 3, simBaseTime: time }
    );
    // Override segment colors to orange for post-burn
    for (const seg of postBurnSegments) {
      seg.color = 'rgba(255, 160, 40, 0.5)';
    }
    drawPostBurnTrajectory(ctx, effectiveCam, postBurnSegments, zoom);
  }

  // In map mode draw a highlighted pulsing ring around the ship so it is visible at zoom-out
  if (mapMode.isActive()) {
    const shipSx = (wp.x - effectiveCam.x) * zoom + canvas.width / 2;
    const shipSy = (wp.y - effectiveCam.y) * zoom + canvas.height / 2;
    const pulse = 1 + Math.sin(time * 4) * 0.25;
    const markerR = 12 * pulse;
    ctx.beginPath();
    ctx.arc(shipSx, shipSy, markerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 220, 80, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner dot
    ctx.beginPath();
    ctx.arc(shipSx, shipSy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 220, 80, 0.95)';
    ctx.fill();
  }

  // Crash effect particles — drawn in world space over everything
  if (crashEffect && crashEffect.active) {
    drawCrashEffect(ctx, effectiveCam, zoom, crashEffect);
  }

  // Minimap — draws in its own canvas, not affected by the main canvas transform
  drawMinimap(minimapCtx, ship, system.bodies, camera);
}
