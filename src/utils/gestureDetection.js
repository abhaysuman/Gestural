/**
 * gestureDetection.js
 * Classifies hand landmarks into gesture states.
 * Uses 2-frame consecutive agreement to eliminate flicker.
 */

function dist2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Returns true if finger tip is above pip which is above mcp (extended) */
function isFingerExtended(lm, tip, pip, mcp) {
  return lm[tip].y < lm[pip].y && lm[pip].y < lm[mcp].y;
}

/**
 * Classify a single frame of landmarks into a gesture string.
 * @param {Array} lm - 21 MediaPipe normalized landmarks
 * @returns {'open'|'fist'|'pinch'|'point'|'peace'|'open'}
 */
export function classifyGesture(lm) {
  const fingers = [
    [8,  6,  5],  // index:  tip, pip, mcp
    [12, 10, 9],  // middle
    [16, 14, 13], // ring
    [20, 18, 17], // pinky
  ];

  const extended = fingers.map(([tip, pip, mcp]) =>
    isFingerExtended(lm, tip, pip, mcp)
  );

  // Pinch: thumb tip (4) to index tip (8) distance < 0.07 normalised
  const pinchDist = dist2D(lm[4], lm[8]);
  if (pinchDist < 0.07) return 'pinch';

  const extCount = extended.filter(Boolean).length;

  // Fist: no fingers extended
  if (extCount === 0) return 'fist';

  // Point: only index extended
  if (extended[0] && !extended[1] && !extended[2] && !extended[3]) return 'point';

  // Peace: index + middle extended, ring + pinky folded
  if (extended[0] && extended[1] && !extended[2] && !extended[3]) return 'peace';

  // Open: 3+ fingers extended
  return 'open';
}

/**
 * Commits a new gesture only after 2 consecutive frames agree.
 * Mutates engine.gestureBuffer and engine.gesture.
 * @param {object} engine - mutable engine ref
 * @param {string} raw    - raw classified gesture this frame
 * @returns {string}       committed gesture
 */
export function commitGesture(engine, raw) {
  engine.gestureBuffer.push(raw);
  if (engine.gestureBuffer.length > 2) engine.gestureBuffer.shift();

  if (
    engine.gestureBuffer.length === 2 &&
    engine.gestureBuffer[0] === raw &&
    engine.gestureBuffer[1] === raw
  ) {
    return raw;
  }
  return engine.gesture; // keep previous committed gesture
}
