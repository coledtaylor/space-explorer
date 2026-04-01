export function drawBody(ctx, body, camera, time) {
  const sx = body.x - camera.x + ctx.canvas.width / 2;
  const sy = body.y - camera.y + ctx.canvas.height / 2;

  // Skip if off screen
  const margin = body.radius * 3;
  if (sx < -margin || sx > ctx.canvas.width + margin ||
      sy < -margin || sy > ctx.canvas.height + margin) return;

  if (body.kind === 'star') {
    drawStar(ctx, sx, sy, body, time);
  } else if (body.kind === 'planet') {
    drawPlanet(ctx, sx, sy, body, time);
  } else if (body.kind === 'anomaly') {
    drawAnomaly(ctx, sx, sy, body, time);
  }

  // Name label
  ctx.font = '11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(200, 210, 220, 0.6)';
  ctx.textAlign = 'center';
  ctx.fillText(body.name, sx, sy + body.radius + 18);
}

function drawStar(ctx, sx, sy, body, time) {
  // Outer glow
  const glowSize = body.radius * 3 + Math.sin(time * 0.5) * 5;
  const glow = ctx.createRadialGradient(sx, sy, body.radius * 0.5, sx, sy, glowSize);
  glow.addColorStop(0, body.glowColor.replace('0.15', '0.3'));
  glow.addColorStop(0.5, body.glowColor);
  glow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, glowSize, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(sx - body.radius * 0.3, sy - body.radius * 0.3, 0, sx, sy, body.radius);
  bodyGrad.addColorStop(0, '#fff');
  bodyGrad.addColorStop(0.4, body.color);
  bodyGrad.addColorStop(1, body.color.replace('rgb', 'rgba').replace(')', ',0.8)'));
  ctx.beginPath();
  ctx.arc(sx, sy, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
}

function drawPlanet(ctx, sx, sy, body, time) {
  // Shadow
  ctx.beginPath();
  ctx.arc(sx + 2, sy + 2, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // Body
  const grad = ctx.createRadialGradient(sx - body.radius * 0.3, sy - body.radius * 0.3, 0, sx, sy, body.radius);
  grad.addColorStop(0, lighten(body.color, 40));
  grad.addColorStop(1, body.color);
  ctx.beginPath();
  ctx.arc(sx, sy, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Atmosphere ring for some types
  if (body.subtype === 'Gas Giant' || body.subtype === 'Ocean World' || body.subtype === 'Lush') {
    ctx.beginPath();
    ctx.arc(sx, sy, body.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(150, 200, 255, 0.15)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawAnomaly(ctx, sx, sy, body, time) {
  // Pulsing rings
  for (let i = 0; i < 3; i++) {
    const r = body.radius + i * 10 + Math.sin(time * 2 + i) * 5;
    const alpha = 0.3 - i * 0.08;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(176, 64, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Core
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, body.radius);
  grad.addColorStop(0, 'rgba(200, 150, 255, 0.8)');
  grad.addColorStop(0.5, 'rgba(176, 64, 255, 0.4)');
  grad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// Hacky but avoids passing camera through every function
let camera_x_hack = 0, camera_y_hack = 0;
export function setCameraHack(cx, cy) {
  camera_x_hack = cx;
  camera_y_hack = cy;
}

// Draw the ship's predicted orbit path around soiBody
export function drawOrbitPath(ctx, camera, orbitalElements, soiBody) {
  if (!orbitalElements || !soiBody) return;

  const { a, e, omega } = orbitalElements;
  if (a === undefined || e === undefined || omega === undefined) return;

  // Screen position of the SOI body (focus of the orbit)
  const focusSx = soiBody.x - camera.x + ctx.canvas.width / 2;
  const focusSy = soiBody.y - camera.y + ctx.canvas.height / 2;

  const cosO = Math.cos(omega);
  const sinO = Math.sin(omega);

  if (e < 1) {
    // Elliptical orbit
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e; // focus offset from ellipse center

    const points = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      // Ellipse in perifocal frame (center at origin, focus at -c along x)
      const xE = a * Math.cos(theta) - c;
      const yE = b * Math.sin(theta);
      // Rotate by omega into world frame, then to screen
      const sx = focusSx + cosO * xE - sinO * yE;
      const sy = focusSy + sinO * xE + cosO * yE;
      points.push({ sx, sy });
    }

    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(points[0].sx, points[0].sy);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].sx, points[i].sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Periapsis marker (at theta=0, xE = a - c = a*(1-e), yE = 0)
    const pxE = a * (1 - e);
    const periSx = focusSx + cosO * pxE;
    const periSy = focusSy + sinO * pxE;
    drawDiamond(ctx, periSx, periSy, 4, 'rgba(79, 195, 247, 0.6)');

    // Apoapsis marker (at theta=PI, xE = -a - c = -a*(1+e), yE = 0)
    const axE = -a * (1 + e);
    const apoSx = focusSx + cosO * axE;
    const apoSy = focusSy + sinO * axE;
    drawDiamond(ctx, apoSx, apoSy, 4, 'rgba(79, 195, 247, 0.6)');
  } else {
    // Hyperbolic orbit
    // For hyperbola: a is negative from computeOrbitalElements (epsilon > 0)
    // p = a*(1-e^2), but since a<0 and e>1, 1-e^2 < 0, so p > 0
    const p = a * (1 - e * e);
    const maxNu = Math.acos(-1 / e) - 0.05;
    const steps = 80;

    const points = [];
    for (let i = 0; i <= steps; i++) {
      const nu = -maxNu + (i / steps) * 2 * maxNu;
      const r = p / (1 + e * Math.cos(nu));
      if (r < 0) continue;
      const xP = r * Math.cos(nu);
      const yP = r * Math.sin(nu);
      // Rotate by omega
      const sx = focusSx + cosO * xP - sinO * yP;
      const sy = focusSy + sinO * xP + cosO * yP;
      points.push({ sx, sy });
    }

    if (points.length < 2) return;

    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255, 150, 50, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(points[0].sx, points[0].sy);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].sx, points[i].sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawDiamond(ctx, sx, sy, size, color) {
  ctx.beginPath();
  ctx.moveTo(sx, sy - size);
  ctx.lineTo(sx + size, sy);
  ctx.lineTo(sx, sy + size);
  ctx.lineTo(sx - size, sy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function lighten(color, amount) {
  const match = color.match(/\d+/g);
  if (!match) return color;
  const [r, g, b] = match.map(Number);
  return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
}

export function drawMinimap(minimapCtx, ship, bodies, camera) {
  const w = minimapCtx.canvas.width;
  const h = minimapCtx.canvas.height;
  const scale = 0.06;

  minimapCtx.clearRect(0, 0, w, h);
  minimapCtx.fillStyle = 'rgba(0, 5, 15, 0.8)';
  minimapCtx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  for (const body of bodies) {
    const bx = cx + (body.x - camera.x) * scale;
    const by = cy + (body.y - camera.y) * scale;
    if (bx < 0 || bx > w || by < 0 || by > h) continue;

    const r = Math.max(1.5, body.radius * scale * 2);

    if (body.kind === 'star') {
      minimapCtx.fillStyle = body.color;
    } else if (body.kind === 'anomaly') {
      minimapCtx.fillStyle = '#b040ff';
    } else {
      minimapCtx.fillStyle = body.color;
    }
    minimapCtx.beginPath();
    minimapCtx.arc(bx, by, r, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  // Ship
  minimapCtx.fillStyle = '#4fc3f7';
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  minimapCtx.fill();
}
