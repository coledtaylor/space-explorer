export function drawBody(ctx, body, camera, time, zoom) {
  zoom = zoom || 1;
  // Apply zoom to camera offset so bodies scale around the camera center
  const sx = (body.x - camera.x) * zoom + ctx.canvas.width / 2;
  const sy = (body.y - camera.y) * zoom + ctx.canvas.height / 2;

  // Scale the body radius for rendering and culling
  const dr = body.radius * zoom;

  // Widen off-screen culling margin by 1/zoom so bodies near screen edges stay visible
  const margin = dr * 3 + ctx.canvas.width * (1 / zoom);
  if (sx < -margin || sx > ctx.canvas.width + margin ||
      sy < -margin || sy > ctx.canvas.height + margin) return;

  if (body.kind === 'star') {
    drawStar(ctx, sx, sy, body, time, zoom);
  } else if (body.kind === 'planet') {
    drawPlanet(ctx, sx, sy, body, time, zoom);
  } else if (body.kind === 'moon') {
    drawMoon(ctx, sx, sy, body, zoom);
  } else if (body.kind === 'anomaly') {
    drawAnomaly(ctx, sx, sy, body, time, zoom);
  }

  // Name label — scale inversely with zoom so text stays readable at map zoom
  const labelScale = 1 / zoom;
  ctx.save();
  ctx.translate(sx, sy + dr + 18 * labelScale);
  ctx.scale(labelScale, labelScale);
  ctx.font = '11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(200, 210, 220, 0.6)';
  ctx.textAlign = 'center';
  ctx.fillText(body.name, 0, 0);
  ctx.restore();
}

function drawStar(ctx, sx, sy, body, time, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
  // Outer glow
  const glowSize = r * 3 + Math.sin(time * 0.5) * 5 * zoom;
  const glow = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, glowSize);
  glow.addColorStop(0, body.glowColor.replace('0.15', '0.3'));
  glow.addColorStop(0.5, body.glowColor);
  glow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, glowSize, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
  bodyGrad.addColorStop(0, '#fff');
  bodyGrad.addColorStop(0.4, body.color);
  bodyGrad.addColorStop(1, body.color.replace('rgb', 'rgba').replace(')', ',0.8)'));
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
}

function drawPlanet(ctx, sx, sy, body, time, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
  // Shadow
  ctx.beginPath();
  ctx.arc(sx + 2 * zoom, sy + 2 * zoom, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // Body
  const grad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
  grad.addColorStop(0, lighten(body.color, 40));
  grad.addColorStop(1, body.color);
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtype-specific effects
  if (body.subtype === 'Gas Giant') {
    drawGasGiantEffects(ctx, sx, sy, body, time, zoom);
  } else if (body.subtype === 'Ice World') {
    drawIceWorldEffects(ctx, sx, sy, body, time, zoom);
  } else if (body.subtype === 'Volcanic') {
    drawVolcanicEffects(ctx, sx, sy, body, zoom);
  } else if (body.subtype === 'Ocean World') {
    drawOceanWorldEffects(ctx, sx, sy, body, zoom);
  } else if (body.subtype === 'Desert') {
    drawDesertEffects(ctx, sx, sy, body, zoom);
  } else if (body.subtype === 'Lush') {
    drawLushEffects(ctx, sx, sy, body, zoom);
  } else if (body.subtype === 'Rocky') {
    drawRockyEffects(ctx, sx, sy, body, zoom);
  }
}

function drawGasGiantEffects(ctx, sx, sy, body, time, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
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
  ctx.lineWidth = Math.max(2 * zoom, r * 0.12);
  ctx.stroke();
  // Front half of ring (over the planet)
  ctx.beginPath();
  ctx.ellipse(sx, sy, ringRx, ringRy, 0.35, 0, Math.PI);
  ctx.strokeStyle = `hsla(${body.hue},50%,70%,0.5)`;
  ctx.lineWidth = Math.max(2 * zoom, r * 0.12);
  ctx.stroke();
}

function drawIceWorldEffects(ctx, sx, sy, body, time, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
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
  const glintR = Math.max(1.5 * zoom, r * 0.12);
  const glintGrad = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, glintR);
  glintGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
  glintGrad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(glintX, glintY, glintR, 0, Math.PI * 2);
  ctx.fillStyle = glintGrad;
  ctx.fill();
}

function drawVolcanicEffects(ctx, sx, sy, body, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
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
    const lr = Math.max(1.5 * zoom, r * 0.1);
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 180, 0, 0.85)';
    ctx.fill();
  }
}

function drawOceanWorldEffects(ctx, sx, sy, body, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
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
  ctx.arc(sx, sy, r + 4 * zoom, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(80, 160, 255, 0.35)';
  ctx.lineWidth = 3 * zoom;
  ctx.stroke();
}

function drawDesertEffects(ctx, sx, sy, body, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
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

function drawLushEffects(ctx, sx, sy, body, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
  // Thin green atmosphere ring
  ctx.beginPath();
  ctx.arc(sx, sy, r + 3 * zoom, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(80, 200, 80, 0.3)';
  ctx.lineWidth = 2 * zoom;
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

function drawRockyEffects(ctx, sx, sy, body, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;
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
    const cr = Math.max(1.5 * zoom, r * 0.14);
    ctx.beginPath();
    ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = zoom;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMoon(ctx, sx, sy, body, zoom) {
  zoom = zoom || 1;
  const r = body.radius * zoom;

  // Base gradient — simpler than planets, no atmosphere
  const grad = ctx.createRadialGradient(sx - r * 0.25, sy - r * 0.25, 0, sx, sy, r);
  grad.addColorStop(0, lighten(body.color, 25));
  grad.addColorStop(1, body.color);
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Crater marks — 2-3 small darker spots, positions derived from hue for determinism
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  const craters = [
    { angle: body.hue * 0.0175, dist: 0.42 },
    { angle: body.hue * 0.0175 + 2.2, dist: 0.48 },
    { angle: body.hue * 0.0175 + 4.5, dist: 0.35 },
  ];
  for (const crater of craters) {
    const cx2 = sx + Math.cos(crater.angle) * r * crater.dist;
    const cy2 = sy + Math.sin(crater.angle) * r * crater.dist;
    const cr = Math.max(1 * zoom, r * 0.12);
    ctx.beginPath();
    ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
  }
  ctx.restore();

  // Faint shadow on one side — crescent/lit appearance
  const shadowGrad = ctx.createRadialGradient(sx + r * 0.4, sy + r * 0.2, 0, sx, sy, r);
  shadowGrad.addColorStop(0, 'transparent');
  shadowGrad.addColorStop(0.55, 'transparent');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();
}

function drawAnomaly(ctx, sx, sy, body, time, zoom) {
  zoom = zoom || 1;
  const br = body.radius * zoom;
  // Pulsing rings
  for (let i = 0; i < 3; i++) {
    const r = br + i * 10 * zoom + Math.sin(time * 2 + i) * 5 * zoom;
    const alpha = 0.3 - i * 0.08;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(176, 64, 255, ${alpha})`;
    ctx.lineWidth = 2 * zoom;
    ctx.stroke();
  }

  // Core
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, br);
  grad.addColorStop(0, 'rgba(200, 150, 255, 0.8)');
  grad.addColorStop(0.5, 'rgba(176, 64, 255, 0.4)');
  grad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, br, 0, Math.PI * 2);
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
export function drawOrbitPath(ctx, camera, orbitalElements, soiBody, zoom) {
  if (!orbitalElements || !soiBody) return;
  zoom = zoom || 1;

  const { a, e, omega } = orbitalElements;
  if (a === undefined || e === undefined || omega === undefined) return;

  // Screen position of the SOI body (focus of the orbit) — apply zoom
  const focusSx = (soiBody.x - camera.x) * zoom + ctx.canvas.width / 2;
  const focusSy = (soiBody.y - camera.y) * zoom + ctx.canvas.height / 2;

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
      // Rotate by omega into world frame, scale by zoom, then to screen
      const sx = focusSx + (cosO * xE - sinO * yE) * zoom;
      const sy = focusSy + (sinO * xE + cosO * yE) * zoom;
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
    const periSx = focusSx + cosO * pxE * zoom;
    const periSy = focusSy + sinO * pxE * zoom;
    drawDiamond(ctx, periSx, periSy, 4, 'rgba(79, 195, 247, 0.6)');

    // Apoapsis marker (at theta=PI, xE = -a - c = -a*(1+e), yE = 0)
    const axE = -a * (1 + e);
    const apoSx = focusSx + cosO * axE * zoom;
    const apoSy = focusSy + sinO * axE * zoom;
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
      // Rotate by omega, scale by zoom
      const sx = focusSx + (cosO * xP - sinO * yP) * zoom;
      const sy = focusSy + (sinO * xP + cosO * yP) * zoom;
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

// Draw all body orbital ellipses (planets around star, moons around planets)
export function drawBodyOrbits(ctx, bodies, camera, zoom) {
  zoom = zoom || 1;

  for (const body of bodies) {
    if (!body.orbitalElements || !body.parentBody) continue;
    if (body.kind === 'anomaly') continue;

    const { a, e, omega } = body.orbitalElements;
    if (a === undefined || e === undefined || omega === undefined) continue;

    // Screen-space semi-major axis — skip if sub-pixel
    const screenA = a * zoom;
    if (screenA < 5) continue;

    const parent = body.parentBody;
    const focusSx = (parent.x - camera.x) * zoom + ctx.canvas.width / 2;
    const focusSy = (parent.y - camera.y) * zoom + ctx.canvas.height / 2;

    const isMoon = body.kind === 'moon';
    const orbitColor = isMoon ? 'rgba(100, 140, 180, 0.08)' : 'rgba(100, 140, 180, 0.15)';
    const lineWidth = isMoon ? 0.5 : 1;

    const b = a * Math.sqrt(1 - e * e);
    const c = a * e; // focus offset from ellipse center

    const cosO = Math.cos(omega);
    const sinO = Math.sin(omega);

    const steps = 72;
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = orbitColor;
    ctx.lineWidth = lineWidth;

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const xE = a * Math.cos(theta) - c;
      const yE = b * Math.sin(theta);
      const sx = focusSx + (cosO * xE - sinO * yE) * zoom;
      const sy = focusSy + (sinO * xE + cosO * yE) * zoom;
      if (i === 0) {
        ctx.moveTo(sx, sy);
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Periapsis marker (theta=0 in ellipse frame, body side: xE = a - c = a*(1-e))
    const pxE = a * (1 - e);
    const periSx = focusSx + cosO * pxE * zoom;
    const periSy = focusSy + sinO * pxE * zoom;
    const markerColor = isMoon ? 'rgba(100, 140, 180, 0.25)' : 'rgba(100, 140, 180, 0.45)';
    drawDiamond(ctx, periSx, periSy, 3, markerColor);

    // Apoapsis marker (theta=PI in ellipse frame: xE = -a - c = -a*(1+e))
    const axE = -a * (1 + e);
    const apoSx = focusSx + cosO * axE * zoom;
    const apoSy = focusSy + sinO * axE * zoom;
    drawDiamond(ctx, apoSx, apoSy, 3, markerColor);
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

  // Find the star to use as center for planet orbit rings
  const star = bodies.find(b => b.kind === 'star');
  const starMx = star ? cx + (star.x - camera.x) * scale : cx;
  const starMy = star ? cy + (star.y - camera.y) * scale : cy;

  // Draw planet orbit rings around the star (before dots so dots render on top)
  minimapCtx.lineWidth = 1;
  for (const body of bodies) {
    if (body.kind !== 'planet') continue;
    if (!body.orbitalElements) continue;
    const orbitR = body.orbitalElements.a * scale;
    minimapCtx.beginPath();
    minimapCtx.arc(starMx, starMy, orbitR, 0, Math.PI * 2);
    minimapCtx.strokeStyle = 'rgba(100, 140, 180, 0.15)';
    minimapCtx.stroke();
  }

  // Draw moon orbit rings around their parent planets
  for (const body of bodies) {
    if (body.kind !== 'moon') continue;
    if (!body.orbitalElements || !body.parentBody) continue;
    const parent = body.parentBody;
    const parentMx = cx + (parent.x - camera.x) * scale;
    const parentMy = cy + (parent.y - camera.y) * scale;
    const orbitR = body.orbitalElements.a * scale;
    minimapCtx.beginPath();
    minimapCtx.arc(parentMx, parentMy, orbitR, 0, Math.PI * 2);
    minimapCtx.strokeStyle = 'rgba(100, 140, 180, 0.08)';
    minimapCtx.stroke();
  }

  for (const body of bodies) {
    const bx = cx + (body.x - camera.x) * scale;
    const by = cy + (body.y - camera.y) * scale;
    if (bx < 0 || bx > w || by < 0 || by > h) continue;

    if (body.kind === 'star') {
      const r = Math.max(1.5, body.radius * scale * 2);
      minimapCtx.fillStyle = body.color;
      minimapCtx.beginPath();
      minimapCtx.arc(bx, by, r, 0, Math.PI * 2);
      minimapCtx.fill();
    } else if (body.kind === 'anomaly') {
      const r = Math.max(1.5, body.radius * scale * 2);
      minimapCtx.fillStyle = '#b040ff';
      minimapCtx.beginPath();
      minimapCtx.arc(bx, by, r, 0, Math.PI * 2);
      minimapCtx.fill();
    } else if (body.kind === 'moon') {
      const r = Math.max(1, body.radius * scale * 1.5);
      const match = body.color.match(/\d+/g);
      if (match) {
        const [mr, mg, mb] = match.map(Number);
        minimapCtx.fillStyle = `rgba(${mr},${mg},${mb},0.55)`;
      } else {
        minimapCtx.fillStyle = 'rgba(160, 160, 170, 0.55)';
      }
      minimapCtx.beginPath();
      minimapCtx.arc(bx, by, r, 0, Math.PI * 2);
      minimapCtx.fill();
    } else {
      const r = Math.max(1.5, body.radius * scale * 2);
      minimapCtx.fillStyle = body.color;
      minimapCtx.beginPath();
      minimapCtx.arc(bx, by, r, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  }

  // Ship
  minimapCtx.fillStyle = '#4fc3f7';
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  minimapCtx.fill();
}
