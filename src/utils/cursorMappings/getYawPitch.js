/**
 * Shared: get head orientation from MediaPipe face landmarks.
 *
 * - yaw: nose left/right vs ear midline (changes when you TURN/rotate head left or right).
 * - pitch: nose up/down vs ears (changes when you LOOK up or down).
 * - tilt: angle of ear-to-ear line in radians (changes when you TILT head, ear toward shoulder).
 *   Tilt left → negative; tilt right → positive. Use this for true “head tilt” left/right.
 */

export function getYawPitch(landmarks) {
  if (!landmarks) return { yaw: 0, pitch: 0, tilt: 0 };
  const nose = landmarks[1];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];
  if (!nose || !leftEar || !rightEar) return { yaw: 0, pitch: 0, tilt: 0 };
  const midX = (leftEar.x + rightEar.x) / 2;
  const midY = (leftEar.y + rightEar.y) / 2;
  const yaw = nose.x - midX;
  const pitch = nose.y - midY - 0.04;
  const dx = rightEar.x - leftEar.x;
  const dy = rightEar.y - leftEar.y;
  const tilt = Math.atan2(dy, dx);
  return { yaw, pitch, tilt };
}
