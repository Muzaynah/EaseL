/**
 * FREE profile: cursor movement is incremental (arrow-key style).
 * Head orientation drives continuous drift; no absolute screen mapping.
 * Used by: Canvas (via useGestureControl internal logic).
 *
 * - Yaw (tilt left/right) → horizontal movement
 * - Pitch (look up/down) → vertical movement
 * - Position accumulates each frame; neutral head = little or no drift.
 */

import { getYawPitch } from "./getYawPitch.js";

const DEADZONE = 0.015;
const SENSITIVITY = 80;
const FRICTION = 0.65;

export function updatePositionFree(landmarks, posRef) {
  if (!landmarks || !posRef?.current) return;
  const { yaw, pitch } = getYawPitch(landmarks);
  const dx = Math.abs(yaw) > DEADZONE ? (yaw - Math.sign(yaw) * DEADZONE) * SENSITIVITY : 0;
  const dy = Math.abs(pitch) > DEADZONE ? (pitch - Math.sign(pitch) * DEADZONE) * SENSITIVITY : 0;
  const w = typeof window !== "undefined" ? window.innerWidth : 800;
  const h = typeof window !== "undefined" ? window.innerHeight : 600;
  posRef.current.x = Math.max(0, Math.min(w, posRef.current.x - dx * FRICTION));
  posRef.current.y = Math.max(0, Math.min(h, posRef.current.y + dy * FRICTION));
}
