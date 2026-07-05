import React from 'react';

const PREVIEWS = [
  ['🖐', 'Wave'],
  ['🤌', 'Shape'],
  ['✊', 'Silence'],
  ['☝️', 'Laser'],
];

/**
 * Onboarding overlay — shown on first load, fades out after camera starts.
 */
export default function Overlay({ onStart, status }) {
  const isLoading = status === 'loading';

  return (
    <div className="overlay">
      <div className="overlay-card">
        <span className="overlay-icon">🖐</span>

        <h1 className="overlay-title">
          GESTURAL<span className="dot">.</span>
        </h1>

        <p className="overlay-desc">
          A hand-controlled AR visual synthesizer. Move your hand to sculpt
          waveforms and light directly in space — no sound, pure visuals.
        </p>

        <div className="gesture-preview">
          {PREVIEWS.map(([emoji, label]) => (
            <div key={label} className="gesture-preview-item">
              <span className="g-emoji">{emoji}</span>
              <span className="g-label">{label}</span>
            </div>
          ))}
        </div>

        <button
          id="startBtn"
          className="start-btn"
          onClick={onStart}
          disabled={isLoading}
        >
          {isLoading ? '⟡ Starting…' : '⟡ Enable Camera'}
        </button>
      </div>
    </div>
  );
}
