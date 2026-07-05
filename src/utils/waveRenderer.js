/**
 * waveRenderer.js
 * Draws the 3D particle ribbon wave on the wave canvas.
 *
 * Primary Hand Y → wave amplitude (0–100% of max)
 * Secondary Hand X, Y → ribbon position (waveX, waveY in engine)
 */

// ── Main entry ───────────────────────────────────────────────────
export function drawWave(ctx, engine, width, height) {
  ctx.clearRect(0, 0, width, height);

  const {
    handY,
    smoothedWaveX,
    smoothedWaveY,
    amplitudeScale,
    isTracking,
    gesture,
    landmarks,
  } = engine;

  // Idle animation when no hand tracked
  if (!isTracking) {
    drawIdleWave(ctx, width, height);
    return;
  }

  // Amplitude driven by primary hand Y position
  const volume = gesture === 'fist' ? 0 : (1 - handY) * 0.6;
  const ampScale = volume / 0.6;
  const maxAmp = 40 + (height * 0.12) * ampScale * amplitudeScale;

  // Position driven by secondary hand (smoothed)
  const cx = smoothedWaveX * width;
  const cy = smoothedWaveY * height;
  const ribbonW = width * 0.32;

  drawRibbon(ctx, cx, cy, ribbonW, maxAmp, 0);

  // ── Laser beam (point gesture) ────────────────────────────────
  if (gesture === 'point' && landmarks) {
    drawLaser(ctx, engine, width, height);
  }
}

// ── 3D Particle Ribbon ─────────────────────────────────────────────
function drawRibbon(ctx, cx, cy, ribbonW, amp, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate(rotation);

  const t = Date.now() / 1000;
  const numStrands = 12;
  const ptsPerStrand = 180;
  const halfW = ribbonW / 2;

  // Pre-build all dots
  const dots = [];

  for (let s = 0; s < numStrands; s++) {
    const sp = (s / numStrands) * Math.PI * 2; // strand phase

    for (let i = 0; i < ptsPerStrand; i++) {
      const n = i / (ptsPerStrand - 1); // 0..1 normalized position
      const x = n * ribbonW - halfW;

      // Edge taper: fade dots at both ends
      const edge = Math.sin(n * Math.PI);

      // 3 overlapping sine waves for organic ribbon shape
      const w1 = Math.sin(n * Math.PI * 3.0 + sp + t * 1.0);
      const w2 = Math.sin(n * Math.PI * 5.5 + sp * 0.6 - t * 0.7);
      const w3 = Math.cos(n * Math.PI * 2.0 - sp * 1.2 + t * 1.3);
      const y = (w1 * 0.55 + w2 * 0.3 + w3 * 0.15) * amp * edge;

      // Z for 3D depth layering
      const z = (Math.sin(n * Math.PI * 4 + sp + t * 1.8) + 1) * 0.5;

      // Color: blue(220) → violet(280) → magenta(330)
      const hue = 220 + n * 110;
      const sat = 80 + z * 20;
      const light = 50 + z * 25;

      // Size: depth + edge taper
      const size = (0.8 + z * 2.0) * (0.3 + edge * 0.7);
      // Opacity
      const alpha = (0.25 + z * 0.75) * (0.15 + edge * 0.85);

      dots.push({ x, y, z, size, hue, sat, light, alpha });
    }
  }

  // Sort back-to-front
  dots.sort((a, b) => a.z - b.z);

  // Draw
  ctx.shadowBlur = 0; // reset once
  for (const d of dots) {
    if (d.size < 0.3 || d.alpha < 0.05) continue; // skip invisible dots
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = `hsl(${d.hue}, ${d.sat}%, ${d.light}%)`;
    ctx.shadowColor = `hsl(${d.hue}, 90%, 70%)`;
    ctx.shadowBlur = 3 + d.z * 6;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Idle animation ─────────────────────────────────────────────────
function drawIdleWave(ctx, width, height) {
  const cx = width * 0.78;
  const cy = height * 0.5;
  const ribbonW = width * 0.32;

  drawRibbon(ctx, cx, cy, ribbonW, 45, 0);
}

// ── Laser beam ─────────────────────────────────────────────────────
function drawLaser(ctx, engine, width, height) {
  const { indexTipX, indexTipY, landmarks } = engine;
  if (!landmarks) return;

  // Direction from index MCP (landmark 5) to tip (landmark 8)
  const mcpX = (1 - landmarks[5].x) * width;
  const mcpY = landmarks[5].y * height;
  const dx   = indexTipX - mcpX;
  const dy   = indexTipY - mcpY;
  const len  = Math.hypot(dx, dy) || 1;
  const nx   = dx / len;
  const ny   = dy / len;
  const beamLen = Math.max(width, height) * 0.45;

  ctx.save();

  // Glow halo
  ctx.strokeStyle = `hsla(300, 100%, 70%, 0.4)`;
  ctx.lineWidth   = 6;
  ctx.shadowColor = `hsl(300, 100%, 70%)`;
  ctx.shadowBlur  = 24;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(indexTipX, indexTipY);
  ctx.lineTo(indexTipX + nx * beamLen, indexTipY + ny * beamLen);
  ctx.stroke();

  // Core beam
  ctx.strokeStyle = `hsl(300, 100%, 70%)`;
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 12;
  ctx.beginPath();
  ctx.moveTo(indexTipX, indexTipY);
  ctx.lineTo(indexTipX + nx * beamLen, indexTipY + ny * beamLen);
  ctx.stroke();

  // White hot centre
  ctx.strokeStyle = `rgba(255,255,255,0.9)`;
  ctx.lineWidth   = 0.8;
  ctx.shadowBlur  = 3;
  ctx.beginPath();
  ctx.moveTo(indexTipX, indexTipY);
  ctx.lineTo(indexTipX + nx * beamLen, indexTipY + ny * beamLen);
  ctx.stroke();

  ctx.restore();
}
