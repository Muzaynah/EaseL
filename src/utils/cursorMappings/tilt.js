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
 * - Optional sensitivity scaling from movementRange and from settings (headSensitivity 0-100, deadZone 0-100).
 * @param {object} calibration - { neutralPosition: { tilt, pitch, yaw }, movementRange?: { ... } }
 * @param {object} [sensitivityOptions] - { headSensitivity?: number 0-100, deadZone?: number 0-100 } from Settings
 */
const DEADZONE_X_CAL = 0.022;
const DEADZONE_Y_CAL = 0.008;
const SENSITIVITY_X_CAL = 58;
const SENSITIVITY_Y_CAL = 320;
const FRICTION_CAL = 0.68;
const SMOOTHING_ALPHA_CAL = 0.85;

/**
 * Rolling-neutral recalibration parameters (framework §3.3).
 * Because CP patients are hypermobile and their resting head position drifts,
 * a one-time calibration is insufficient.  We maintain a rolling window of
 * recent tilt/pitch/yaw samples and, for frames that are low-velocity (the
 * head is momentarily at rest), we take the median and blend it into a live
 * neutral baseline.  All cursor displacement is then computed relative to
 * this rolling neutral, not the initial calibration.
 *
 * Two knobs are caregiver-configurable:
 *   - rollingNeutralStrength (0-100) scales the blend rate.  0 disables
 *     rolling recalibration entirely (pure static calibration); 100 makes
 *     it aggressive.  Quadratic curve so the low end stays very gentle.
 *   - freezeRecalibration is a per-frame gate toggled on during active
 *     strokes / trials so the baseline never drifts mid-attempt.
 */
const NEUTRAL_WINDOW_MS = 2000;
const NEUTRAL_BLEND_MAX = 0.08;
const LOW_VELOCITY_TILT = 0.0025;
const LOW_VELOCITY_PITCH = 0.002;
const LOW_VELOCITY_YAW = 0.0025;

function getNeutralBlend(rollingNeutralStrength) {
  const s = Number(rollingNeutralStrength);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const clamped = Math.max(0, Math.min(100, s));
  // quadratic: gentle at the low end, aggressive only at the top.
  const t = clamped / 100;
  return t * t * NEUTRAL_BLEND_MAX;
}

function pushSample(buf, value, now) {
  buf.push({ t: now, v: value });
  while (buf.length && now - buf[0].t > NEUTRAL_WINDOW_MS) buf.shift();
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function getSensitivityMultiplier(headSensitivity) {
  const v = headSensitivity ?? 75;
  return 0.3 + (Number(v) / 100) * 1.5;
}
function getDeadZoneMultiplier(deadZone) {
  const v = deadZone ?? 25;
  return 0.5 + (Number(v) / 100) * 1.5;
}

export function updatePositionTiltWithCalibration(landmarks, posRef, stateRef, calibration, sensitivityOptions) {
  try {
    if (!landmarks || !posRef?.current) return;
    if (!stateRef?.current) stateRef.current = createTiltStateWithCalibration();

    const baseNeutral = calibration?.neutralPosition ?? { tilt: 0, pitch: 0, yaw: 0 };
    const { tilt, pitch, yaw } = getYawPitch(landmarks);
    const state = stateRef.current;

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();

    const lastTilt = state.lastTilt ?? tilt;
    const lastPitch = state.lastPitch ?? pitch;
    const lastYaw = state.lastYaw ?? yaw;
    const dTilt = Math.abs(tilt - lastTilt);
    const dPitch = Math.abs(pitch - lastPitch);
    const dYaw = Math.abs(yaw - lastYaw);
    state.lastTilt = tilt;
    state.lastPitch = pitch;
    state.lastYaw = yaw;

    const neutralBlend = getNeutralBlend(sensitivityOptions?.rollingNeutralStrength);
    const freezeRecalibration = Boolean(sensitivityOptions?.freezeRecalibration);
    const recalibrationEnabled = neutralBlend > 0 && !freezeRecalibration;

    // Only sample a potential new neutral when (a) the user isn't mid-stroke
    // and (b) rolling recalibration isn't disabled.  Velocity-tracking still
    // runs above so resuming after a freeze doesn't see a false spike.
    if (
      recalibrationEnabled &&
      dTilt < LOW_VELOCITY_TILT &&
      dPitch < LOW_VELOCITY_PITCH &&
      dYaw < LOW_VELOCITY_YAW
    ) {
      pushSample(state.neutralTiltBuf, tilt, now);
      pushSample(state.neutralPitchBuf, pitch, now);
      pushSample(state.neutralYawBuf, yaw, now);
    }

    const initTilt = Number(baseNeutral.tilt) || 0;
    const initPitch = Number(baseNeutral.pitch) || 0;
    const initYaw = Number(baseNeutral.yaw) || 0;

    if (state.rollingTilt == null) {
      state.rollingTilt = initTilt;
      state.rollingPitch = initPitch;
      state.rollingYaw = initYaw;
    }

    if (recalibrationEnabled && state.neutralTiltBuf.length >= 8) {
      const mTilt = median(state.neutralTiltBuf.map((s) => s.v));
      const mPitch = median(state.neutralPitchBuf.map((s) => s.v));
      const mYaw = median(state.neutralYawBuf.map((s) => s.v));
      state.rollingTilt = (1 - neutralBlend) * state.rollingTilt + neutralBlend * mTilt;
      state.rollingPitch = (1 - neutralBlend) * state.rollingPitch + neutralBlend * mPitch;
      state.rollingYaw = (1 - neutralBlend) * state.rollingYaw + neutralBlend * mYaw;
    }

    const neutralTilt = state.rollingTilt;
    const neutralPitch = state.rollingPitch;
    const neutralYaw = state.rollingYaw;

    const relTilt = Number(tilt) - neutralTilt;
    const relPitch = Number(pitch) - neutralPitch;
    const relYaw = Number(yaw) - neutralYaw;

    state.smoothedTilt = SMOOTHING_ALPHA_CAL * (state.smoothedTilt ?? 0) + (1 - SMOOTHING_ALPHA_CAL) * relTilt;
    state.smoothedPitch = SMOOTHING_ALPHA_CAL * (state.smoothedPitch ?? 0) + (1 - SMOOTHING_ALPHA_CAL) * relPitch;
    state.smoothedYaw = SMOOTHING_ALPHA_CAL * (state.smoothedYaw ?? 0) + (1 - SMOOTHING_ALPHA_CAL) * relYaw;

    state.lastJitter = Math.hypot(dTilt, dPitch);

    const horizontal = ((state.smoothedTilt ?? 0) + (state.smoothedYaw ?? 0)) / 2;
    const vertical = state.smoothedPitch ?? 0;

    const sensMult = getSensitivityMultiplier(sensitivityOptions?.headSensitivity);
    const dzMult = getDeadZoneMultiplier(sensitivityOptions?.deadZone);
    const dzX = DEADZONE_X_CAL * dzMult;
    const dzY = DEADZONE_Y_CAL * dzMult;

    let sensX = SENSITIVITY_X_CAL * sensMult;
    let sensY = SENSITIVITY_Y_CAL * sensMult;
    const range = calibration?.movementRange;
    if (range && typeof range.maxTilt === "number" && typeof range.minTilt === "number") {
      const spanTilt = Math.max(0.08, range.maxTilt - range.minTilt);
      if (spanTilt < 0.2) sensX = Math.min(75, sensX * (0.2 / spanTilt));
    }
    if (range && typeof range.maxPitch === "number" && typeof range.minPitch === "number") {
      const spanPitch = Math.max(0.04, range.maxPitch - range.minPitch);
      if (spanPitch < 0.1) sensY = Math.min(400, sensY * (0.1 / spanPitch));
    }

    const dx = Math.abs(horizontal) > dzX
      ? (horizontal - Math.sign(horizontal) * dzX) * sensX
      : 0;
    const dy = Math.abs(vertical) > dzY
      ? (vertical - Math.sign(vertical) * dzY) * sensY
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

/** State for calibration-aware update (includes yaw + rolling-neutral buffers). */
export function createTiltStateWithCalibration() {
  return {
    smoothedTilt: 0,
    smoothedPitch: 0,
    smoothedYaw: 0,
    neutralTiltBuf: [],
    neutralPitchBuf: [],
    neutralYawBuf: [],
    rollingTilt: null,
    rollingPitch: null,
    rollingYaw: null,
    lastTilt: null,
    lastPitch: null,
    lastYaw: null,
    lastJitter: 0,
  };
}
