/**
 * TILT profile: incremental movement (arrow-key style), stabilized and smoothed.
 * True head TILT (ear toward shoulder) drives left/right; look up/down drives up/down.
 *
 * - Tilt left/right (ear toward shoulder) → horizontal cursor movement (uses ear-to-ear angle).
 * - Look up/down (pitch) → vertical cursor movement.
 * - Smoothed with EMA. stateRef holds { smoothedTilt, smoothedPitch }.
 */

import { getYawPitch } from "./getYawPitch.js";

const DEADZONE_TILT = 0.04;
const DEADZONE_PITCH = 0.012;
const SENSITIVITY_X = 30;
const SENSITIVITY_Y = 200;
const FRICTION = 0.3;
const SMOOTHING_ALPHA = 0.88;

export function updatePositionTilt(landmarks, posRef, stateRef) {
  if (!landmarks || !posRef?.current) return;
  if (!stateRef?.current) stateRef.current = { smoothedTilt: 0, smoothedPitch: 0 };

  const { tilt, pitch } = getYawPitch(landmarks);
  const state = stateRef.current;
  state.smoothedTilt = SMOOTHING_ALPHA * state.smoothedTilt + (1 - SMOOTHING_ALPHA) * tilt;
  state.smoothedPitch = SMOOTHING_ALPHA * state.smoothedPitch + (1 - SMOOTHING_ALPHA) * pitch;

  const dx = Math.abs(state.smoothedTilt) > DEADZONE_TILT
    ? (state.smoothedTilt - Math.sign(state.smoothedTilt) * DEADZONE_TILT) * SENSITIVITY_X
    : 0;
  const dy = Math.abs(state.smoothedPitch) > DEADZONE_PITCH
    ? (state.smoothedPitch - Math.sign(state.smoothedPitch) * DEADZONE_PITCH) * SENSITIVITY_Y
    : 0;

  const w = typeof window !== "undefined" ? window.innerWidth : 800;
  const h = typeof window !== "undefined" ? window.innerHeight : 600;
  posRef.current.x = Math.max(0, Math.min(w, posRef.current.x - dx * FRICTION));
  posRef.current.y = Math.max(0, Math.min(h, posRef.current.y + dy * FRICTION));
}

/** Create initial state for TILT. Use once per component, e.g. useRef(createTiltState()). */
export function createTiltState() {
  return { smoothedTilt: 0, smoothedPitch: 0 };
}
