import React from 'react';

const WAVEFORMS = [
  { id: 'sine',     label: 'SINE' },
  { id: 'square',   label: 'SQR'  },
  { id: 'sawtooth', label: 'SAW'  },
  { id: 'triangle', label: 'TRI'  },
];

/**
 * Bottom-right waveform selector.
 * Active chip highlighted in violet. Also responds to pinch gesture from parent.
 *
 * @param {{ waveform: string, onSelect: (id:string) => void }} props
 */
export default function WaveformSelector({ waveform, onSelect }) {
  return (
    <div className="wave-panel glass">
      <div className="wave-panel-label">Waveform</div>
      <div className="wave-chips">
        {WAVEFORMS.map(({ id, label }) => (
          <button
            key={id}
            id={`chip-${id}`}
            className={`wave-chip${waveform === id ? ' active' : ''}`}
            onClick={() => onSelect(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
