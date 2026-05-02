import { getCurrentTierConfig } from "./modeConfig";
import {
  contentPaddingForCanvas,
  generateCorridor,
  generateClosedShape,
} from "./corridorGeometry";
import { getStage, variantForAttempt } from "./lessonContent";

/**
 * Returns the shared lesson path (corridor) for a given legacy tier so Path 1
 * and Path 2 use the same path. Kept for the older /lesson-mode1 and
 * /lesson-mode2 routes (redirect to /lesson-path1/2) until fully migrated to stage-based
 * lookups via `getStageLessonPath`.
 */
export function getLessonPath(tier, canvasWidth, canvasHeight) {
  const config = getCurrentTierConfig(2, tier);
  if (!config) return null;
  return generateCorridor(
    config.corridorType,
    config.corridorWidth,
    config.corridorLength,
    canvasWidth,
    canvasHeight
  );
}

/**
 * Framework §6.4 stage-based lesson path. Given a stage descriptor from
 * `lessonContent.LESSON_STAGES` (and the current attempt index for stages that
 * rotate through variants) returns the full path + any decorations.
 */
export function getStageLessonPath(stage, attemptIndex, canvasWidth, canvasHeight, options = {}) {
  if (!stage) return null;
  // An explicit `options.variant` (e.g. "square") overrides the automatic
  // attempt-index rotation.  This lets LessonSelect launch a specific
  // variant tile without the user having to cycle through attempts.
  const variant = options.variant ?? variantForAttempt(stage, attemptIndex ?? 0);

  if (stage.shape === "hold") {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const pad = contentPaddingForCanvas(canvasWidth, canvasHeight, stage.holdRadius * 2);
    const maxR = Math.min(
      centerX - pad,
      centerY - pad,
      canvasWidth - pad - centerX,
      canvasHeight - pad - centerY,
    );
    const holdRadius = Math.max(40, Math.min(stage.holdRadius, maxR - 12));
    return {
      type: "hold",
      start: { x: centerX, y: centerY },
      end: { x: centerX, y: centerY },
      width: holdRadius * 2,
      centerline: [{ x: centerX, y: centerY }],
      holdRadius,
      holdMs: stage.holdMs,
    };
  }

  if (stage.shape === "straight" || stage.shape === "gentle-curve" || stage.shape === "complex-curve") {
    return generateCorridor(
      stage.shape,
      stage.corridorWidth,
      stage.corridorLength,
      canvasWidth,
      canvasHeight,
    );
  }

  if (stage.shape === "closed") {
    return generateClosedShape(variant ?? "circle", stage.corridorWidth, canvasWidth, canvasHeight);
  }

  if (stage.shape === "construction") {
    return generateClosedShape(variant ?? "sun", stage.corridorWidth, canvasWidth, canvasHeight);
  }

  return null;
}

/** Build the cached lesson path for a stage, re-generating when attempt rotates. */
export function buildStagePath(stage, attemptIndex, canvasWidth, canvasHeight) {
  return getStageLessonPath(getStage(stage?.stage ?? stage), attemptIndex, canvasWidth, canvasHeight);
}

/** Map angle in radians to 8-direction string (same bins as useIntentCapture). */
function angleToDirection(angleDeg) {
  if (angleDeg >= -22.5 && angleDeg < 22.5) return "right";
  if (angleDeg >= 22.5 && angleDeg < 67.5) return "down-right";
  if (angleDeg >= 67.5 && angleDeg < 112.5) return "down";
  if (angleDeg >= 112.5 && angleDeg < 157.5) return "down-left";
  if (angleDeg >= 157.5 || angleDeg < -157.5) return "left";
  if (angleDeg >= -157.5 && angleDeg < -112.5) return "up-left";
  if (angleDeg >= -112.5 && angleDeg < -67.5) return "up";
  return "up-right";
}

/**
 * Direction of the path at segment index (from path[i] toward path[i+1]).
 * centerline: array of {x,y}. index: 0 to centerline.length - 2.
 * Returns 8-direction string or null if no forward segment.
 */
export function getPathDirectionAt(centerline, index) {
  if (!centerline?.length || index < 0 || index >= centerline.length - 1) return null;
  const from = centerline[index];
  const to = centerline[index + 1];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return angleToDirection(angleDeg);
}

/**
 * Whether the user's tilt direction matches the path direction at the current index.
 * pathDirection: from getPathDirectionAt. detectedDirection: from useIntentCapture.
 */
export function tiltMatchesPathDirection(pathDirection, detectedDirection) {
  if (!pathDirection || !detectedDirection || detectedDirection === "none") return false;
  return pathDirection === detectedDirection;
}

/**
 * Distance from point to the nearest point on the path (centerline).
 */
export function distanceToPath(point, centerline) {
  if (!centerline?.length) return Infinity;
  let minDist = Infinity;
  for (let i = 0; i < centerline.length - 1; i++) {
    const d = distanceToSegment(point, centerline[i], centerline[i + 1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

/**
 * Nearest point on the path to the given point. Returns
 *  - point, pathIndex: vertex-ish index (legacy, integer)
 *  - pathIndexFloat: position along the polyline in "vertex" space (i + t on the best segment; range ~0..L-1) for smooth rail sync
 */
export function getNearestPointOnPath(point, centerline) {
  if (!centerline?.length) return null;
  if (centerline.length === 1) {
    return { point: centerline[0], pathIndex: 0, pathIndexFloat: 0 };
  }
  let minDist = Infinity;
  let best = null;
  let bestIndex = 0;
  let bestI = 0;
  let bestT = 0;
  for (let i = 0; i < centerline.length - 1; i++) {
    const { point: proj, t } = projectToSegment(point, centerline[i], centerline[i + 1]);
    const d = Math.hypot(point.x - proj.x, point.y - proj.y);
    if (d < minDist) {
      minDist = d;
      best = proj;
      bestIndex = t >= 1 ? i + 1 : i;
      bestI = i;
      bestT = t;
    }
  }
  if (best === null) {
    return { point: centerline[0], pathIndex: 0, pathIndexFloat: 0 };
  }
  const pathIndexFloat = Math.max(
    0,
    Math.min(centerline.length - 1, bestI + bestT),
  );
  return { point: best, pathIndex: bestIndex, pathIndexFloat };
}

function projectToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { point: { ...a }, t: 0 };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return {
    point: { x: a.x + t * dx, y: a.y + t * dy },
    t,
  };
}
