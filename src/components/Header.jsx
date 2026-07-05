import React from 'react';

const STATUS_MAP = {
  standby:    { dotClass: '',        label: 'STANDBY',   labelActive: false },
  loading:    { dotClass: 'loading', label: 'LOADING',   labelActive: false },
  searching:  { dotClass: 'loading', label: 'SEARCHING', labelActive: false },
  active:     { dotClass: 'active',  label: 'ACTIVE',    labelActive: true  },
  'no-camera':{ dotClass: '',        label: 'NO CAMERA', labelActive: false },
};

export default function Header({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.standby;

  return (
    <header className="header">
      <div className="wordmark">
        GESTURAL<span className="dot">.</span>
      </div>

      <div className="status-pill glass">
        <div className={`status-dot ${cfg.dotClass}`} />
        <span className={`status-label ${cfg.labelActive ? 'active' : ''}`}>
          {cfg.label}
        </span>
      </div>
    </header>
  );
}
