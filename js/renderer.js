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
  // Orbit ring (subtle)
  if (body.orbitRadius) {
    const centerSx = -camera_x_hack + ctx.canvas.width / 2;
    const centerSy = -camera_y_hack + ctx.canvas.height / 2;
    ctx.beginPath();
    ctx.arc(centerSx, centerSy, body.orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

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
