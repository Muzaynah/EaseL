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
    title: "Direction basics",
    titleUr: "سمت سیکھیں",
    description:
      "Learn left, right, up, and down with short guided lines.",
    icon: "eye",
    shape: "straight",
    autocompleteLevel: 100,
    corridorWidth: 220,
    corridorLength: 920,
    requiredAdherence: 50,
    trialsForMastery: 4,
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
    holdMs: 3000,
    autocompleteLevel: 100,
    requiredAdherence: 0,
    trialsForMastery: 3,
  },
  {
    stage: 2,
    mode: 1,
    title: "Guided tracing",
    titleUr: "رہنمائی کے ساتھ ٹریسنگ",
    description:
      "Tilt in the correct direction to move the trace, then autocomplete from halfway.",
    icon: "play",
    shape: "straight",
    autocompleteLevel: 50,
    corridorWidth: 200,
    corridorLength: 920,
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
    corridorLength: 1000,
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
    corridorLength: 1040,
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

/** Localised short name for circle / square / kite / … (tiles + lesson chrome). */
export const LESSON_VARIANT_LABELS = {
  en: {
    circle: "Circle",
    square: "Square",
    triangle: "Triangle",
    sun: "Sun",
    kite: "Kite",
    house: "House",
  },
  ur: {
    circle: "دائرہ",
    square: "مربع",
    triangle: "مثلث",
    sun: "سورج",
    kite: "پتنگ",
    house: "گھر",
  },
};

export function lessonVariantDisplayName(language, variantKey) {
  if (!variantKey) return "";
  const lang = language === "ur" ? "ur" : "en";
  return LESSON_VARIANT_LABELS[lang][variantKey] ?? String(variantKey);
}

/**
 * Respects `?variant=` from the lesson URL when it matches this stage's list;
 * otherwise uses `variantForAttempt` (attempt rotation).
 */
export function getEffectiveLessonVariant(stage, attemptIndex, forcedUrlVariant) {
  if (!stage) return null;
  const candidates = variantsForStage(stage)
    .map((v) => v.variant)
    .filter((k) => k != null && k !== "");
  if (forcedUrlVariant && candidates.includes(forcedUrlVariant)) {
    return forcedUrlVariant;
  }
  return variantForAttempt(stage, attemptIndex);
}

/** How many numbered sub-lessons in this stage (1 for stages 0–4; 3 for shapes; 3 for constructions). */
export function lessonCountInStage(stage) {
  const list = variantsForStage(stage);
  if (!list.length) return 1;
  const withKeys = list.filter((e) => e.variant != null);
  return withKeys.length > 0 ? withKeys.length : 1;
}

/** 1-based index of this variant inside the stage (circle → 1 …). Single-shape stages → 1. */
export function lessonIndexWithinStage(stage, variantKey) {
  const rows = variantsForStage(stage).map((e) => e.variant);
  if (!rows.some((x) => x != null)) return 1;
  if (!variantKey) return 1;
  const i = rows.findIndex((k) => k === variantKey);
  return i >= 0 ? i + 1 : 1;
}
