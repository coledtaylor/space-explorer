import { Ship } from './ship.js';
import { Input } from './input.js';
import { Starfield } from './starfield.js';
import { generateSystem, updateBodyPositions } from './celestial.js';
import { drawBody, drawMinimap, setCameraHack, drawOrbitPath } from './renderer.js';
import { checkSOITransition, shipWorldPosition } from './physics.js';
import { dist } from './utils.js';

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
const locationDisplay = document.getElementById('location-display');
const coordsDisplay = document.getElementById('coords-display');
const fuelDisplay = document.getElementById('fuel-display');
const speedDisplay = document.getElementById('speed-display');
const hud = document.getElementById('hud');
const minimap = document.getElementById('minimap');
const orbitHud = document.getElementById('orbit-hud');

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

const input = new Input(canvas);
const starfield = new Starfield();
const camera = { x: 0, y: 0 };

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
  time += dt;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

function update(dt) {
  // Compute world position for camera aim update
  const worldPos = shipWorldPosition(ship, system);

  // Update aim using world-space ship position
  const shipScreenX = worldPos.x - camera.x + canvas.width / 2;
  const shipScreenY = worldPos.y - camera.y + canvas.height / 2;
  input.updateAim(shipScreenX, shipScreenY);

  updateBodyPositions(system, dt);
  ship.update(dt, input, ship.currentSOIBody);

  // SOI transition check — must happen after both ship and body positions are updated
  checkSOITransition(ship, system);

  // Recompute world position after possible transition
  const wp = shipWorldPosition(ship, system);

  // Camera follows ship world-space position smoothly
  camera.x += (wp.x - camera.x) * 0.08;
  camera.y += (wp.y - camera.y) * 0.08;

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

  // Click to scan
  const click = input.consumeClick();
  if (click) {
    for (const body of system.bodies) {
      const bsx = body.x - camera.x + canvas.width / 2;
      const bsy = body.y - camera.y + canvas.height / 2;
      if (dist(click.x, click.y, bsx, bsy) < body.radius + 20) {
        showScan(body);
        break;
      }
    }
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
  if (dist(wp.x, wp.y, 0, 0) > 2000) {
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
  }
}

function showScan(body) {
  scanName.textContent = body.name;
  scanType.textContent = body.subtype || body.kind;
  scanDesc.textContent = body.description;
  scanDetails.innerHTML = '';
  if (body.details) {
    for (const [key, val] of Object.entries(body.details)) {
      const line = document.createElement('div');
      line.textContent = `${key}: ${val}`;
      scanDetails.appendChild(line);
    }
  }
  scanPanel.classList.remove('hidden');
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#010108';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  starfield.draw(ctx, camera, time);

  setCameraHack(camera.x, camera.y);

  // Draw bodies (stars first, then planets, then anomalies)
  const sorted = [...system.bodies].sort((a, b) => {
    const order = { star: 0, planet: 1, anomaly: 2 };
    return (order[a.kind] || 0) - (order[b.kind] || 0);
  });
  for (const body of sorted) {
    drawBody(ctx, body, camera, time);
  }

  // Draw ship's predicted orbit path
  drawOrbitPath(ctx, camera, ship.orbit, ship.currentSOIBody);

  // Draw ship at world-space screen position
  const wp = shipWorldPosition(ship, system);
  ship.draw(ctx, camera, wp);

  // Minimap
  drawMinimap(minimapCtx, ship, system.bodies, camera);
}
