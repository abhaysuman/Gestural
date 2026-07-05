import React from 'react';

const HINTS = [
  { key: 'open',  emoji: '🖐', text: 'Open — control freq & amplitude' },
  { key: 'pinch', emoji: '🤌', text: 'Pinch — cycle waveform shape' },
  { key: 'fist',  emoji: '✊', text: 'Fist — collapse wave' },
  { key: 'point', emoji: '☝️', text: 'Point — laser beam' },
];

/**
 * Right-side gesture reference panel.
 * Active gesture row is highlighted via .hint-active class.
 * @param {{ gesture: string }} props
 */
export default function HintPanel({ gesture }) {
  return (
    <aside className="hint-panel glass">
      <div className="hint-title">Gestures</div>

      {HINTS.map(({ key, emoji, text }) => (
        <div
          key={key}
          className={`hint-row${gesture === key ? ' hint-active' : ''}`}
        >
          <span className="hint-gesture">{emoji}</span>
          <span className="hint-text">{text}</span>
        </div>
      ))}
    </aside>
  );
}
