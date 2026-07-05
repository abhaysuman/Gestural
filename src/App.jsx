import React, {
  useRef, useState, useEffect, useCallback,
} from 'react';

import Header           from './components/Header.jsx';
import HintPanel        from './components/HintPanel.jsx';
import MetricsRow       from './components/MetricsRow.jsx';
import WaveformSelector from './components/WaveformSelector.jsx';
import CameraControls   from './components/CameraControls.jsx';
import Overlay          from './components/Overlay.jsx';

import { classifyGesture, commitGesture } from './utils/gestureDetection.js';
import { drawWave }                        from './utils/waveRenderer.js';
import { drawHand }                        from './utils/handRenderer.js';
import {
  spawnParticle, updateParticles, drawParticles,
} from './utils/particleSystem.js';

// ── Waveform cycle order (pinch gesture) ─────────────────────────
const WAVEFORM_CYCLE = ['sine', 'square', 'sawtooth', 'triangle'];

// ── Engine factory — mutable ref, never triggers React renders ───
function createEngine() {
  return {
    // Hand position (normalised, mirrored)
    handX: 0.5,
    handY: 0.5,

    // Lerped wave Y anchor (canvas pixels)
    smoothedY: window.innerHeight / 2,

    // 3D Wave positions (normalized)
    waveX: 0.78,
    waveY: 0.5,
    smoothedWaveX: 0.78,
    smoothedWaveY: 0.5,

    // Wrist tilt in radians (clamped ±60°)
    tiltAngle: 0,

    // Gesture state
    gesture:       'none',
    gestureBuffer: [],
    isTracking:    false,
    landmarks:     null,

    // Canvas-space positions for particles / laser
    palmX:      0,
    palmY:      0,
    indexTipX:  0,
    indexTipY:  0,

    // Visual state
    particles:      [],
    wavePhase:      0,
    waveform:       'sine',

    // Smooth amplitude collapse on fist (0 = flat, 1 = full amp)
    amplitudeScale: 0,

    // Gesture timing
    lastPinchTime: 0,

    // Frame counter (for throttled UI updates)
    frame: 0,

    // Caps
    PARTICLE_CAP:  400,
    PINCH_DEBOUNCE: 600, // ms
  };
}

// ── App ──────────────────────────────────────────────────────────
export default function App() {
  // DOM refs
  const videoRef    = useRef(null);
  const waveRef     = useRef(null);
  const handRef     = useRef(null);
  const particleRef = useRef(null);
  const bgRef       = useRef(null);
  const stageRef    = useRef(null);

  // Mutable engine (not state — never triggers renders)
  const engineRef = useRef(createEngine());

  // ── React state (drives UI re-renders) ──────────────────────
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [status, setStatus]                 = useState('standby');
  const [waveform, setWaveform]             = useState('sine');
  const [zoomLevel, setZoomLevel]           = useState(0.85);
  const [noCameraMsg, setNoCameraMsg]       = useState(false);

  // Throttled display values (~10 Hz)
  const [metrics, setMetrics] = useState({
    freq:    '—',
    amp:     '—',
    gesture: 'none',
    freqPct: 0,
    ampPct:  0,
  });
  const [isTracking, setIsTracking] = useState(false);

  // ── Sync waveform selection → engine ────────────────────────
  useEffect(() => {
    engineRef.current.waveform = waveform;
  }, [waveform]);

  // ── Canvas resize handler ────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      [waveRef, handRef, particleRef].forEach((r) => {
        if (r.current) {
          r.current.width  = w;
          r.current.height = h;
        }
      });
      if (!engineRef.current.isTracking) {
        engineRef.current.smoothedY = h / 2;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── RAF render loop ──────────────────────────────────────────
  useEffect(() => {
    let rafId;

    const loop = () => {
      const e = engineRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      e.frame = (e.frame + 1) % 1000;
      e.wavePhase += 0.04; // wave animation speed

      // Lerp 3D wave position
      e.smoothedWaveX += (e.waveX - e.smoothedWaveX) * 0.12;
      e.smoothedWaveY += (e.waveY - e.smoothedWaveY) * 0.12;

      // Lerp wave Y anchor toward current hand Y
      const targetY = e.handY * h;
      e.smoothedY  += (targetY - e.smoothedY) * 0.15;

      // Lerp amplitude scale: 0 (fist/none) → 1 (tracking)
      const wantsAmp = e.isTracking && e.gesture !== 'fist' ? 1 : 0;
      e.amplitudeScale += (wantsAmp - e.amplitudeScale) * 0.08;

      // ─ Particle canvas ─
      if (particleRef.current) {
        const ctx = particleRef.current.getContext('2d');
        updateParticles(e);
        drawParticles(ctx, e, w, h);
      }

      // ─ Wave canvas ─
      if (waveRef.current) {
        const ctx = waveRef.current.getContext('2d');
        drawWave(ctx, e, w, h);
      }

      // ─ Hand skeleton canvas ─
      if (handRef.current) {
        const ctx = handRef.current.getContext('2d');
        drawHand(ctx, e, w, h);
      }

      // ─ Dynamic background gradient ─
      if (bgRef.current && e.isTracking) {
        const hue = 180 + e.handX * 180;
        const bx  = e.handX * 100;
        const by  = e.handY * 100;
        bgRef.current.style.background =
          `radial-gradient(ellipse at ${bx}% ${by}%, ` +
          `hsl(${hue}, 70%, 88%) 0%, ` +
          `hsl(${(hue + 40) % 360}, 50%, 93%) 55%, ` +
          `hsl(${(hue + 80) % 360}, 30%, 96%) 100%)`;
      }

      // ─ Throttled React state sync (~10 Hz) ─
      if (e.frame % 6 === 0) {
        const rawFreq = 1 + e.handX * 7;
        const rawAmp  = (1 - e.handY) * 100;
        setMetrics({
          freq:    e.isTracking ? rawFreq.toFixed(1) + '×' : '—',
          amp:     e.isTracking ? Math.round(rawAmp) + '%' : '—',
          gesture: e.gesture,
          freqPct: e.isTracking ? ((rawFreq - 1) / 7) * 100 : 0,
          ampPct:  e.isTracking ? rawAmp : 0,
        });
        setIsTracking(e.isTracking);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── MediaPipe onResults callback ─────────────────────────────
  const handleResults = useCallback((results) => {
    const e   = engineRef.current;
    const landmarksList  = results.multiHandLandmarks;
    const handednessList = results.multiHandedness;
    const w   = window.innerWidth;
    const h   = window.innerHeight;

    if (landmarksList && landmarksList.length > 0) {
      e.isTracking = true;

      let primaryLm = null;
      let secondaryLm = null;

      if (landmarksList.length === 1) {
        primaryLm = landmarksList[0];
      } else if (landmarksList.length >= 2) {
        if (handednessList && handednessList.length >= 2) {
          const label0 = handednessList[0].label;
          if (label0 === 'Right') {
            // "Right" in MediaPipe actually means user's left hand in mirror mode
            primaryLm = landmarksList[0];
            secondaryLm = landmarksList[1];
          } else {
            primaryLm = landmarksList[1];
            secondaryLm = landmarksList[0];
          }
        } else {
          primaryLm = landmarksList[0];
          secondaryLm = landmarksList[1];
        }
      }

      e.landmarks = primaryLm;
      const lm = primaryLm;

      // Mirror X for selfie view (video is CSS-mirrored via scaleX(-1))
      e.handX = 1 - lm[0].x;
      e.handY = lm[0].y;

      // Secondary hand controls the wave
      if (secondaryLm) {
        e.waveX = 1 - secondaryLm[0].x;
        e.waveY = secondaryLm[0].y;
      } else {
        // Drift back to default
        e.waveX += (0.78 - e.waveX) * 0.03;
        e.waveY += (0.5 - e.waveY) * 0.03;
      }

      // Canvas-space positions
      e.palmX      = e.handX * w;
      e.palmY      = e.handY * h;
      e.indexTipX  = (1 - lm[8].x) * w;
      e.indexTipY  = lm[8].y * h;

      // Wrist tilt: angle from wrist (0) to middle-MCP (9), clamped ±60°
      const rawAngle  = Math.atan2(
        lm[9].y - lm[0].y,
        (1 - lm[9].x) - (1 - lm[0].x),
      );
      const CLAMP_RAD = (60 * Math.PI) / 180;
      e.tiltAngle = Math.max(
        -CLAMP_RAD,
        Math.min(CLAMP_RAD, rawAngle - Math.PI / 2),
      );

      // Classify + commit gesture (2-frame debounce)
      const raw       = classifyGesture(lm);
      const committed = commitGesture(e, raw);

      // Pinch → cycle waveform (debounced 600ms)
      if (committed === 'pinch' && e.gesture !== 'pinch') {
        const now = Date.now();
        if (now - e.lastPinchTime > e.PINCH_DEBOUNCE) {
          const idx  = WAVEFORM_CYCLE.indexOf(e.waveform);
          const next = WAVEFORM_CYCLE[(idx + 1) % WAVEFORM_CYCLE.length];
          e.waveform = next;
          setWaveform(next); // sync to React state for chip UI
          e.lastPinchTime = now;
        }
      }

      e.gesture = committed;

      // Spawn particles
      if (e.gesture === 'point') {
        if (Math.random() < 0.6) spawnParticle(e, 'laser');
      } else if (e.gesture !== 'fist') {
        if (Math.random() < 0.15) spawnParticle(e, 'ambient');
      }

      setStatus('active');
    } else {
      // No hand in frame
      e.isTracking    = false;
      e.landmarks     = null;
      e.gestureBuffer = [];
      e.gesture       = 'none';
      e.waveX         = 0.78;
      e.waveY         = 0.5;
      setStatus('searching');
    }
  }, []);

  // ── Start camera + MediaPipe ─────────────────────────────────
  const startCamera = useCallback(async () => {
    setStatus('loading');

    try {
      const Hands  = window.Hands;
      const Camera = window.Camera;

      if (!Hands || !Camera) {
        throw new Error(
          'MediaPipe not loaded — check your internet connection and reload.',
        );
      }

      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands:            2,
        modelComplexity:        1, // full model for better occlusion handling
        minDetectionConfidence: 0.7,
        minTrackingConfidence:  0.6,
      });

      hands.onResults(handleResults);

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width:      640,
        height:     480,
        facingMode: 'user',
      });

      await camera.start();

      // Dismiss overlay
      setOverlayVisible(false);
      setStatus('searching');
    } catch (err) {
      console.error('[GESTURAL] Camera/MediaPipe error:', err);
      setStatus('no-camera');
      setNoCameraMsg(true);
      setOverlayVisible(false);
    }
  }, [handleResults]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="app">
      {/* 0 — Dynamic background (behind everything) */}
      <div ref={bgRef} className="bg-gradient" />

      {/* 1–4 — AR Stage: video + canvas layers, scaled by zoom */}
      <div
        ref={stageRef}
        className="ar-stage"
        style={{
          transform:       `scale(${zoomLevel})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Layer 1: live camera */}
        <video
          ref={videoRef}
          className="video-layer"
          autoPlay
          playsInline
          muted
        />
        {/* Layer 2: particles */}
        <canvas ref={particleRef} className="canvas-layer" />
        {/* Layer 3: oscilloscope wave */}
        <canvas ref={waveRef}     className="canvas-layer" />
        {/* Layer 4: hand skeleton */}
        <canvas ref={handRef}     className="canvas-layer" />
      </div>

      {/* 5 — Glass UI (not scaled, always full-screen) */}
      <div className="ui-layer">
        <Header status={status} />

        <HintPanel gesture={metrics.gesture} />

        <MetricsRow
          metrics={metrics}
          isTracking={isTracking}
          showNoCameraMsg={noCameraMsg}
        />

        <WaveformSelector waveform={waveform} onSelect={setWaveform} />

        <CameraControls zoomLevel={zoomLevel} onZoomChange={setZoomLevel} />
      </div>

      {/* 6 — Onboarding overlay */}
      {overlayVisible && (
        <Overlay onStart={startCamera} status={status} />
      )}
    </div>
  );
}
