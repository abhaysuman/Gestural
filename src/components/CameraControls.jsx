import React from 'react';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;
const STEP     = 0.1;

function clamp(v) {
  return Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v)) * 10) / 10;
}

/**
 * Bottom-center camera zoom controls.
 * Scales the AR stage (video + canvases) via CSS transform in App.
 *
 * @param {{ zoomLevel: number, onZoomChange: (fn) => void }} props
 */
export default function CameraControls({ zoomLevel, onZoomChange }) {
  const pct = Math.round(zoomLevel * 100);

  const zoomOut  = () => onZoomChange((z) => clamp(z - STEP));
  const zoomIn   = () => onZoomChange((z) => clamp(z + STEP));
  const resetZoom = () => onZoomChange(0.85);

  return (
    <div className="camera-controls glass">
      <div className="camera-controls-label">📷 Zoom</div>
      <div className="camera-controls-row">
        <button
          className="zoom-btn"
          id="zoomOutBtn"
          onClick={zoomOut}
          aria-label="Zoom out"
          disabled={zoomLevel <= MIN_ZOOM}
        >
          −
        </button>

        <button
          className="zoom-pct"
          id="zoomResetBtn"
          onClick={resetZoom}
          title="Reset to 85%"
        >
          {pct}%
        </button>

        <button
          className="zoom-btn"
          id="zoomInBtn"
          onClick={zoomIn}
          aria-label="Zoom in"
          disabled={zoomLevel >= MAX_ZOOM}
        >
          +
        </button>
      </div>
    </div>
  );
}
