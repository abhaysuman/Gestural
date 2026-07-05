import React from 'react';

const GESTURE_LABELS = {
  open:  '🖐 OPEN',
  fist:  '✊ FIST',
  pinch: '🤌 PINCH',
  point: '☝️ POINT',
  peace: '✌️ PEACE',
  none:  '—',
};

/**
 * Bottom-left metrics row.
 * Shows FREQ (wave frequency multiplier), AMP (amplitude %), and current GESTURE.
 *
 * @param {{ metrics: {freq:string, amp:string, gesture:string, freqPct:number, ampPct:number}, isTracking: boolean }} props
 */
export default function MetricsRow({ metrics, isTracking, showNoCameraMsg }) {
  const { freq, amp, gesture, freqPct = 0, ampPct = 0 } = metrics;

  return (
    <div className="metrics">
      {/* FREQ card */}
      <div className={`metric-card glass${isTracking ? ' tracking' : ''}`}>
        <div className="metric-label">Freq</div>
        <div className="metric-value">{freq}</div>
        <div className="metric-bar-track">
          <div className="metric-bar-fill" style={{ width: `${freqPct}%` }} />
        </div>
      </div>

      {/* AMP card */}
      <div className={`metric-card glass${isTracking ? ' tracking' : ''}`}>
        <div className="metric-label">Amp</div>
        <div className="metric-value">{amp}</div>
        <div className="metric-bar-track">
          <div className="metric-bar-fill" style={{ width: `${ampPct}%` }} />
        </div>
      </div>

      {/* GESTURE card */}
      <div className={`metric-card glass${isTracking ? ' tracking' : ''}`}>
        <div className="metric-label">Gesture</div>
        <div className="metric-value gesture-value">
          {GESTURE_LABELS[gesture] ?? '—'}
        </div>
      </div>

      {/* No-camera inline message */}
      {showNoCameraMsg && (
        <div className="metric-card glass no-camera-card">
          <p>
            <strong>Camera access denied.</strong>
            <br />
            Click the camera icon in your browser's address bar, allow access,
            then reload.
          </p>
        </div>
      )}
    </div>
  );
}
