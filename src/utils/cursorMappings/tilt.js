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

/**
 * Calibration-aware cursor update for screener (and optionally elsewhere).
 * - Uses neutralPosition so "zero" is the user's resting pose (better for CP).
 * - Horizontal movement = blend of TILT (ear toward shoulder) and YAW (turn face), so user can use either.
 * - Optional sensitivity scaling from movementRange.
 * @param {object} calibration - { neutralPosition: { tilt, pitch, yaw }, movementRange?: { ... } }
 */
const DEADZONE_X_CAL = 0.022;
const DEADZONE_Y_CAL = 0.008;
const SENSITIVITY_X_CAL = 58;
const SENSITIVITY_Y_CAL = 320;
const FRICTION_CAL = 0.68;
const SMOOTHING_ALPHA_CAL = 0.85;

export function updatePositionTiltWithCalibration(landmarks, posRef, stateRef, calibration) {
  try {
    if (!landmarks || !posRef?.current) return;
    if (!stateRef?.current) stateRef.current = { smoothedTilt: 0, smoothedPitch: 0, smoothedYaw: 0 };

    const neutral = calibration?.neutralPosition ?? { tilt: 0, pitch: 0, yaw: 0 };
    const { tilt, pitch, yaw } = getYawPitch(landmarks);
    const relTilt = Number(tilt) - (Number(neutral.tilt) || 0);
    const relPitch = Number(pitch) - (Number(neutral.pitch) || 0);
    const relYaw = Number(yaw) - (Number(neutral.yaw) || 0);

    const state = stateRef.current;
    state.smoothedTilt = SMOOTHING_ALPHA_CAL * (state.smoothedTilt ?? 0) + (1 - SMOOTHING_ALPHA_CAL) * relTilt;
    state.smoothedPitch = SMOOTHING_ALPHA_CAL * (state.smoothedPitch ?? 0) + (1 - SMOOTHING_ALPHA_CAL) * relPitch;
    state.smoothedYaw = SMOOTHING_ALPHA_CAL * (state.smoothedYaw ?? 0) + (1 - SMOOTHING_ALPHA_CAL) * relYaw;

    const horizontal = ((state.smoothedTilt ?? 0) + (state.smoothedYaw ?? 0)) / 2;
    const vertical = state.smoothedPitch ?? 0;

    let sensX = SENSITIVITY_X_CAL;
    let sensY = SENSITIVITY_Y_CAL;
    const range = calibration?.movementRange;
    if (range && typeof range.maxTilt === "number" && typeof range.minTilt === "number") {
      const spanTilt = Math.max(0.08, range.maxTilt - range.minTilt);
      if (spanTilt < 0.2) sensX = Math.min(75, sensX * (0.2 / spanTilt));
    }
    if (range && typeof range.maxPitch === "number" && typeof range.minPitch === "number") {
      const spanPitch = Math.max(0.04, range.maxPitch - range.minPitch);
      if (spanPitch < 0.1) sensY = Math.min(400, sensY * (0.1 / spanPitch));
    }

    const dx = Math.abs(horizontal) > DEADZONE_X_CAL
      ? (horizontal - Math.sign(horizontal) * DEADZONE_X_CAL) * sensX
      : 0;
    const dy = Math.abs(vertical) > DEADZONE_Y_CAL
      ? (vertical - Math.sign(vertical) * DEADZONE_Y_CAL) * sensY
      : 0;

    const w = typeof window !== "undefined" ? window.innerWidth : 800;
    const h = typeof window !== "undefined" ? window.innerHeight : 600;
    const x = posRef.current.x - dx * FRICTION_CAL;
    const y = posRef.current.y + dy * FRICTION_CAL;
    posRef.current.x = Math.max(0, Math.min(w, Number.isFinite(x) ? x : posRef.current.x));
    posRef.current.y = Math.max(0, Math.min(h, Number.isFinite(y) ? y : posRef.current.y));
  } catch (e) {
    if (typeof console !== "undefined" && console.warn) console.warn("[EaseL] updatePositionTiltWithCalibration:", e);
  }
}

/** State for calibration-aware update (includes yaw). */
export function createTiltStateWithCalibration() {
  return { smoothedTilt: 0, smoothedPitch: 0, smoothedYaw: 0 };
}
