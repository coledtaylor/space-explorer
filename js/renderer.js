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
  } else if (body.kind === 'moon') {
    drawMoon(ctx, sx, sy, body);
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

  // Subtype-specific effects
  if (body.subtype === 'Gas Giant') {
    drawGasGiantEffects(ctx, sx, sy, body, time);
  } else if (body.subtype === 'Ice World') {
    drawIceWorldEffects(ctx, sx, sy, body, time);
  } else if (body.subtype === 'Volcanic') {
    drawVolcanicEffects(ctx, sx, sy, body);
  } else if (body.subtype === 'Ocean World') {
    drawOceanWorldEffects(ctx, sx, sy, body);
  } else if (body.subtype === 'Desert') {
    drawDesertEffects(ctx, sx, sy, body);
  } else if (body.subtype === 'Lush') {
    drawLushEffects(ctx, sx, sy, body);
  } else if (body.subtype === 'Rocky') {
    drawRockyEffects(ctx, sx, sy, body);
  }
}

function drawGasGiantEffects(ctx, sx, sy, body, time) {
  const r = body.radius;
  // Cloud bands clipped to planet circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  const bandCount = 4;
  for (let i = 0; i < bandCount; i++) {
    const yOff = -r + (i / bandCount) * r * 2;
    const bandH = r * 2 / bandCount;
    const alpha = i % 2 === 0 ? 0.18 : 0.08;
    ctx.fillStyle = `hsla(${body.hue},60%,${i % 2 === 0 ? 75 : 45}%,${alpha})`;
    ctx.fillRect(sx - r, sy + yOff, r * 2, bandH);
  }
  ctx.restore();
  // Ring behind planet (draw back half, then body re-clip, then front half)
  const ringRx = r * 1.6;
  const ringRy = r * 0.35;
  // Back half of ring
  ctx.beginPath();
  ctx.ellipse(sx, sy, ringRx, ringRy, 0.35, Math.PI, Math.PI * 2);
  ctx.strokeStyle = `hsla(${body.hue},50%,70%,0.35)`;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.stroke();
  // Front half of ring (over the planet)
  ctx.beginPath();
  ctx.ellipse(sx, sy, ringRx, ringRy, 0.35, 0, Math.PI);
  ctx.strokeStyle = `hsla(${body.hue},50%,70%,0.5)`;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.stroke();
}

function drawIceWorldEffects(ctx, sx, sy, body, time) {
  const r = body.radius;
  // Faint blue-white outer glow
  const glow = ctx.createRadialGradient(sx, sy, r * 0.8, sx, sy, r * 1.6);
  glow.addColorStop(0, 'rgba(200, 230, 255, 0.15)');
  glow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, r * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  // Shifting specular glint
  const glintAngle = time * 0.4;
  const glintX = sx + Math.cos(glintAngle) * r * 0.3;
  const glintY = sy + Math.sin(glintAngle) * r * 0.2 - r * 0.25;
  const glintR = Math.max(1.5, r * 0.12);
  const glintGrad = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, glintR);
  glintGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
  glintGrad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(glintX, glintY, glintR, 0, Math.PI * 2);
  ctx.fillStyle = glintGrad;
  ctx.fill();
}

function drawVolcanicEffects(ctx, sx, sy, body) {
  const r = body.radius;
  // Red-orange heat glow
  const heatGlow = ctx.createRadialGradient(sx, sy, r * 0.85, sx, sy, r * 1.55);
  heatGlow.addColorStop(0, 'rgba(255, 80, 0, 0.18)');
  heatGlow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, r * 1.55, 0, Math.PI * 2);
  ctx.fillStyle = heatGlow;
  ctx.fill();
  // Lava spots — deterministic positions from hue
  const spots = [
    { angle: body.hue * 0.0175, dist: 0.5 },
    { angle: body.hue * 0.0175 + 2.1, dist: 0.45 },
    { angle: body.hue * 0.0175 + 4.3, dist: 0.55 },
  ];
  for (const spot of spots) {
    const lx = sx + Math.cos(spot.angle) * r * spot.dist;
    const ly = sy + Math.sin(spot.angle) * r * spot.dist;
    const lr = Math.max(1.5, r * 0.1);
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 180, 0, 0.85)';
    ctx.fill();
  }
}

function drawOceanWorldEffects(ctx, sx, sy, body) {
  const r = body.radius;
  // Wave-like bands clipped to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    const yOff = -r * 0.5 + i * r * 0.4;
    ctx.fillStyle = `rgba(30, 100, 200, 0.12)`;
    ctx.fillRect(sx - r, sy + yOff, r * 2, r * 0.18);
  }
  ctx.restore();
  // Thicker brighter atmosphere ring
  ctx.beginPath();
  ctx.arc(sx, sy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(80, 160, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawDesertEffects(ctx, sx, sy, body) {
  const r = body.radius;
  // Warm dust haze glow
  const dustGlow = ctx.createRadialGradient(sx, sy, r * 0.9, sx, sy, r * 1.5);
  dustGlow.addColorStop(0, 'rgba(200, 140, 60, 0.12)');
  dustGlow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = dustGlow;
  ctx.fill();
  // Sandy darker bands clipped to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    const yOff = -r * 0.6 + i * r * 0.45;
    ctx.fillStyle = 'rgba(80, 40, 0, 0.12)';
    ctx.fillRect(sx - r, sy + yOff, r * 2, r * 0.15);
  }
  ctx.restore();
}

function drawLushEffects(ctx, sx, sy, body) {
  const r = body.radius;
  // Thin green atmosphere ring
  ctx.beginPath();
  ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(80, 200, 80, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Continent-like darker arcs clipped to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  const continents = [
    { angle: body.hue * 0.0175, arcLen: 0.9 },
    { angle: body.hue * 0.0175 + 2.3, arcLen: 0.7 },
    { angle: body.hue * 0.0175 + 4.1, arcLen: 0.6 },
  ];
  for (const c of continents) {
    const cx2 = sx + Math.cos(c.angle) * r * 0.4;
    const cy2 = sy + Math.sin(c.angle) * r * 0.4;
    ctx.beginPath();
    ctx.arc(cx2, cy2, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 80, 20, 0.22)';
    ctx.fill();
  }
  ctx.restore();
}

function drawRockyEffects(ctx, sx, sy, body) {
  const r = body.radius;
  // Crater marks clipped to planet circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  const craters = [
    { angle: body.hue * 0.0175, dist: 0.45 },
    { angle: body.hue * 0.0175 + 2.0, dist: 0.5 },
    { angle: body.hue * 0.0175 + 3.8, dist: 0.38 },
  ];
  for (const crater of craters) {
    const cx2 = sx + Math.cos(crater.angle) * r * crater.dist;
    const cy2 = sy + Math.sin(crater.angle) * r * crater.dist;
    const cr = Math.max(1.5, r * 0.14);
    ctx.beginPath();
    ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMoon(ctx, sx, sy, body) {
  // Simple grey sphere with subtle gradient
  const grad = ctx.createRadialGradient(sx - body.radius * 0.3, sy - body.radius * 0.3, 0, sx, sy, body.radius);
  grad.addColorStop(0, lighten(body.color, 30));
  grad.addColorStop(1, body.color);
  ctx.beginPath();
  ctx.arc(sx, sy, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
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
