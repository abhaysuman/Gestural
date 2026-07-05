/**
 * waveRenderer.js
 * Draws the visual waveform on the wave canvas.
 * No audio — wave is generated mathematically each frame.
 *
 * Hand X → wave frequency (1×–8× cycles across screen)
 * Hand Y → wave amplitude (0–100% of max)
 * Wrist tilt → canvas rotation (±60°)
 * amplitudeScale → lerped 0→1, collapses on fist
 */

// ── Wave Generator Functions ──────────────────────────────────────
const WAVE_FN = {
  sine: (t) => Math.sin(t),

  square: (t) => (Math.sin(t) >= 0 ? 1 : -1),

  sawtooth: (t) => {
    // Normalise to [0,1) then map to [-1,+1)
    const n = ((t / (2 * Math.PI)) % 1 + 1) % 1;
    return 2 * n - 1;
  },

  triangle: (t) => {
    const n = ((t / (2 * Math.PI)) % 1 + 1) % 1;
    return n < 0.5 ? 4 * n - 1 : 3 - 4 * n;
  },
};

const NUM_POINTS = 300;

// ── Main draw entry ───────────────────────────────────────────────
export function drawWave(ctx, engine, width, height) {
  ctx.clearRect(0, 0, width, height);

  const {
    handX, handY, smoothedY, tiltAngle,
    gesture, waveform, wavePhase, amplitudeScale, isTracking,
    indexTipX, indexTipY, landmarks,
  } = engine;

  // Idle animation when no hand tracked
  if (!isTracking) {
    drawIdleWave(ctx, width, height, wavePhase);
    return;
  }

  const hue       = 180 + handX * 180;           // cyan → magenta
  const frequency = 1 + handX * 7;               // 1 to 8 cycles
  const maxAmp    = height * 0.22;
  const amplitude = (1 - handY) * maxAmp * amplitudeScale;

  const cx = width / 2;
  const cy = smoothedY;

  const waveFn = WAVE_FN[waveform] || WAVE_FN.sine;

  // ── Primary wave ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tiltAngle);

  // Outer glow pass (wider, more blur)
  ctx.beginPath();
  ctx.strokeStyle = `hsla(${hue}, 90%, 65%, 0.25)`;
  ctx.lineWidth   = 8;
  ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
  ctx.shadowBlur  = 28;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  buildWavePath(ctx, waveFn, frequency, amplitude, wavePhase, width, NUM_POINTS);
  ctx.stroke();

  // Core line pass
  ctx.beginPath();
  ctx.strokeStyle = `hsl(${hue}, 90%, 65%)`;
  ctx.lineWidth   = 2.5;
  ctx.shadowBlur  = 14;
  buildWavePath(ctx, waveFn, frequency, amplitude, wavePhase, width, NUM_POINTS);
  ctx.stroke();

  // ── Second harmonic (always sine @ 2× frequency) ─────────────
  if (amplitude > 3) {
    ctx.beginPath();
    ctx.strokeStyle = `hsla(${hue}, 90%, 75%, 0.3)`;
    ctx.lineWidth   = 1.5;
    ctx.shadowBlur  = 6;
    ctx.globalAlpha = 0.5;
    buildWavePath(ctx, WAVE_FN.sine, frequency * 2, amplitude * 0.4, wavePhase * 1.3, width, NUM_POINTS);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // ── Laser beam (point gesture) ────────────────────────────────
  if (gesture === 'point' && landmarks) {
    drawLaser(ctx, engine, width, height);
  }

  // ── Subtle pulse rings at wave anchor ─────────────────────────
  if (gesture !== 'fist' && amplitude > 6) {
    drawPulseRings(ctx, cx, cy, hue, wavePhase);
  }
}

// ── Build wave path helper ─────────────────────────────────────────
function buildWavePath(ctx, waveFn, frequency, amplitude, phase, width, nPts) {
  const sliceWidth = width / nPts;
  for (let i = 0; i < nPts; i++) {
    const x = i * sliceWidth - width / 2;
    const t = (i / nPts) * frequency * Math.PI * 2 + phase;
    const y = waveFn(t) * amplitude;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

// ── Idle animation ─────────────────────────────────────────────────
function drawIdleWave(ctx, width, height, phase) {
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Slow gentle sine
  ctx.beginPath();
  ctx.strokeStyle = `hsla(195, 70%, 65%, 0.4)`;
  ctx.lineWidth   = 1.8;
  ctx.shadowColor = `hsl(195, 80%, 65%)`;
  ctx.shadowBlur  = 10;
  ctx.lineCap     = 'round';
  buildWavePath(ctx, WAVE_FN.sine, 3, 28, phase * 0.4, width, 300);
  ctx.stroke();

  ctx.restore();
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

// ── Pulse rings around wave centre ─────────────────────────────────
function drawPulseRings(ctx, cx, cy, hue, phase) {
  for (let i = 0; i < 3; i++) {
    const r     = 12 + i * 18 + Math.sin(phase * 1.5 + i * 1.2) * 5;
    const alpha = Math.max(0, 0.14 - i * 0.04);

    ctx.save();
    ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;
    ctx.lineWidth   = 1;
    ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
