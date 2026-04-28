/**
 * Framework §6.4 Micro-Skill Progression Ladder — the canonical lesson
 * catalogue used by both LessonSelect and the lesson screens. Mode 1 users
 * operate primarily in Stages 0–3 with full autocomplete; Mode 2 users may
 * reach Stages 4–6 with reduced assistance. Higher stages are intentionally
 * omitted for now to keep scope honest.
 *
 * Each stage owns:
 *   - a primitive shape definition (straight / curve / shape / construction)
 *   - an assistance envelope (corridor width, autocomplete level)
 *   - mastery criteria (required adherence, trials)
 *   - a culturally familiar label where appropriate (kite, sun, house).
 */

export const LESSON_STAGES = [
  {
    stage: 0,
    mode: 1,
    title: "Cause and effect",
    titleUr: "سر ہلائیں، لکیر بنائیں",
    description:
      "Tilt your head — the line follows. No buttons, no mouth. Fills up as you tilt.",
    icon: "eye",
    shape: "straight",
    autocompleteLevel: 100,
    corridorWidth: 220,
    corridorLength: 520,
    requiredAdherence: 50,
    trialsForMastery: 3,
  },
  {
    stage: 1,
    mode: 1,
    title: "Hold still",
    titleUr: "سر کو روکیں",
    description:
      "Move to the circle and hold your head still. The app learns your resting pose.",
    icon: "target",
    shape: "hold",
    holdRadius: 160,
    holdMs: 1500,
    autocompleteLevel: 100,
    requiredAdherence: 0,
    trialsForMastery: 3,
  },
  {
    stage: 2,
    mode: 1,
    title: "Start and stop",
    titleUr: "شروع اور ختم",
    description:
      "Open your mouth (or hold still) once to start, once to finish. We fill the rest.",
    icon: "play",
    shape: "straight",
    autocompleteLevel: 80,
    corridorWidth: 200,
    corridorLength: 520,
    requiredAdherence: 45,
    trialsForMastery: 3,
  },
  {
    stage: 3,
    mode: 2,
    title: "Straight line",
    titleUr: "سیدھی لکیر",
    description: "Trace a wide straight road. Plenty of room to wobble.",
    icon: "minus",
    shape: "straight",
    autocompleteLevel: 40,
    corridorWidth: 200,
    corridorLength: 560,
    requiredAdherence: 45,
    trialsForMastery: 5,
  },
  {
    stage: 4,
    mode: 2,
    title: "Rainbow arc",
    titleUr: "قوس قزح",
    description: "A soft curve — arc up and back down, like a rainbow.",
    icon: "arc",
    shape: "gentle-curve",
    autocompleteLevel: 25,
    corridorWidth: 160,
    corridorLength: 600,
    requiredAdherence: 45,
    trialsForMastery: 5,
  },
  {
    stage: 5,
    mode: 2,
    title: "Closed shapes",
    titleUr: "بند شکلیں",
    description: "Draw around a circle, square, or triangle — all the way back to start.",
    icon: "circle",
    shape: "closed",
    closedShapes: ["circle", "square", "triangle"],
    autocompleteLevel: 15,
    corridorWidth: 130,
    corridorLength: 0,
    requiredAdherence: 40,
    trialsForMastery: 5,
  },
  {
    stage: 6,
    mode: 2,
    title: "Familiar picture",
    titleUr: "آشنا تصویر",
    description: "A kite, a sun, or a little house — one shape at a time.",
    icon: "sparkles",
    shape: "construction",
    construction: ["sun", "kite", "house"],
    autocompleteLevel: 10,
    corridorWidth: 120,
    corridorLength: 0,
    requiredAdherence: 40,
    trialsForMastery: 5,
  },
];

export function getStage(stage) {
  return LESSON_STAGES.find((s) => s.stage === stage) ?? LESSON_STAGES[0];
}

// Canonical naming aliases (Path -> Level) used by newer UI/copy.
export const getLevel = getStage;

export function stagesForMode(mode) {
  if (mode === 1) return LESSON_STAGES.filter((s) => s.mode === 1);
  return LESSON_STAGES.filter((s) => s.mode === 2 || s.stage === 2);
}

export const levelsForPath = stagesForMode;

/**
 * First curriculum level index for a path (1 or 2). Path 1 starts at level
 * index 0 (Cause and effect); Path 2 starts at level index 3 (Straight line).
 * Used after path assignment and when normalising legacy profiles whose stored
 * level index is below their path floor.
 */
export function firstStageForMode(mode) {
  return mode === 1 ? 0 : 3;
}

/**
 * Highest curriculum level index valid for a path. Path 1 tops out at index 2;
 * Path 2 tops out at index 6 in the current catalogue.
 */
export function lastStageForMode(mode) {
  return mode === 1 ? 2 : 6;
}

/** Pick a specific variant within a stage (e.g. which closed shape). */
export function variantForAttempt(stage, attemptIndex) {
  if (stage.closedShapes?.length)
    return stage.closedShapes[attemptIndex % stage.closedShapes.length];
  if (stage.construction?.length)
    return stage.construction[attemptIndex % stage.construction.length];
  return null;
}

/**
 * List every variant in a stage as distinct shape identifiers.  Stages with
 * a single fixed shape (Stage 0-4) return a single-element array with a
 * sensible label.  Stages 5/6 return one entry per variant (circle /
 * square / triangle, sun / kite / house).  Used by LessonSelect to render
 * one tile per variant when the stage is unlocked.
 */
export function variantsForStage(stage) {
  if (!stage) return [];
  if (stage.closedShapes?.length) {
    return stage.closedShapes.map((v) => ({ variant: v, label: v }));
  }
  if (stage.construction?.length) {
    return stage.construction.map((v) => ({ variant: v, label: v }));
  }
  return [{ variant: null, label: stage.shape }];
}
