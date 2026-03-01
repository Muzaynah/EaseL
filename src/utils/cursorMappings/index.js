/**
 * Cursor mapping profiles: how head orientation (yaw/pitch) drives cursor position.
 *
 * - FREE: incremental drift, no smoothing. Used by Canvas (in useGestureControl).
 * - TILT: incremental drift, smoothed; arrow-key style. Used by Screener, Eligibility.
 *
 * Both are relative/incremental (no absolute screen mapping).
 */

export { getYawPitch } from "./getYawPitch.js";
export { updatePositionFree } from "./free.js";
export { updatePositionTilt, createTiltState } from "./tilt.js";
