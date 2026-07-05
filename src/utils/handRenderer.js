/**
 * handRenderer.js
 * Draws the 21-point MediaPipe hand skeleton on its own canvas.
 * Hue shifts with hand X position (cyan → magenta).
 */

// MediaPipe hand topology — 23 bone connections
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm transversals
  [5, 9], [9, 13], [13, 17],
];

// Fingertip landmark indices
const FINGERTIPS = new Set([4, 8, 12, 16, 20]);

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} engine - mutable engine state ref
 * @param {number} width  - canvas pixel width
 * @param {number} height - canvas pixel height
 */
export function drawHand(ctx, engine, width, height) {
  ctx.clearRect(0, 0, width, height);

  const { landmarks, handX, isTracking } = engine;
  if (!landmarks || !isTracking) return;

  const hue = 180 + handX * 180; // cyan → magenta

  // Map normalised landmark coords → canvas pixels.
  // X is flipped (1 - lm.x) because the video is mirrored via CSS scaleX(-1).
  const pts = landmarks.map((lm) => ({
    x: (1 - lm.x) * width,
    y: lm.y * height,
  }));

  ctx.save();

  // ── Bone connections ─────────────────────────────────────────
  ctx.strokeStyle = `hsla(${hue}, 90%, 65%, 0.5)`;
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
  ctx.shadowBlur  = 6;
  ctx.lineCap     = 'round';

  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  }

  // ── Joint dots ───────────────────────────────────────────────
  for (let i = 0; i < 21; i++) {
    const isTip  = FINGERTIPS.has(i);
    const radius = isTip ? 5 : 3;
    const lit    = isTip ? '100%' : '80%';

    ctx.beginPath();
    ctx.fillStyle   = `hsl(${hue}, 90%, ${lit})`;
    ctx.shadowColor = `hsl(${hue}, 90%, 75%)`;
    ctx.shadowBlur  = isTip ? 10 : 5;
    ctx.arc(pts[i].x, pts[i].y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
