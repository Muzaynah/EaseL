/**
 * Shared: get head orientation from MediaPipe face landmarks.
 *
 * - yaw: nose left/right vs ear midline (changes when you TURN/rotate head left or right).
 * - pitch: nose up/down vs ears (changes when you LOOK up or down).
 * - tilt: angle of ear-to-ear line in radians (changes when you TILT head, ear toward shoulder).
 *   Tilt left → negative; tilt right → positive. Use this for true “head tilt” left/right.
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function getYawPitch(landmarks) {
  if (!landmarks || !Array.isArray(landmarks)) return { yaw: 0, pitch: 0, tilt: 0 };
  try {
    const nose = landmarks[1];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    if (!nose || !leftEar || !rightEar) return { yaw: 0, pitch: 0, tilt: 0 };
    const midX = (num(leftEar.x) + num(rightEar.x)) / 2;
    const midY = (num(leftEar.y) + num(rightEar.y)) / 2;
    const yaw = num(nose.x) - midX;
    const pitch = num(nose.y) - midY - 0.04;
    const dx = num(rightEar.x) - num(leftEar.x);
    const dy = num(rightEar.y) - num(leftEar.y);
    const tilt = Math.atan2(dy, dx);
    return { yaw, pitch, tilt };
  } catch {
    return { yaw: 0, pitch: 0, tilt: 0 };
  }
}
