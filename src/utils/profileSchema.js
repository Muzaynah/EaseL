/**
 * Profile schema: one per account, stored in Firestore.
 * Combines identity, caregiver-reported details, and app-derived state.
 */

import { firstStageForMode, lastStageForMode } from "./lessonContent";

function derivePathLevelFromLegacyTier(pathId, tier) {
  if (pathId === 1) return tier === 1 ? 1 : 2;
  if (pathId === 2) return tier === 3 ? 1 : 2;
  return null;
}

export const DISABILITY_LEVEL_OPTIONS = [
  { value: "mild", label: "Mild", description: "Uses hands with some difficulty" },
  { value: "moderate", label: "Moderate", description: "Minimal hand use" },
  { value: "severe", label: "Severe", description: "No functional hand use" },
];

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
];

export const SESSION_LENGTH_OPTIONS = [
  { value: 5, label: "5–10 min" },
  { value: 15, label: "15–30 min" },
];

/** Default profile shape when creating a new account (caregiver-reported + app fields). */
export function createDefaultProfile(account) {
  const now = Date.now();
  return {
    name: account.name ?? "",
    email: account.email ?? "",
    createdBy: account.createdBy ?? null,
    caregiverReported: {
      disabilityLevel: account.caregiverReported?.disabilityLevel ?? null,
      manualAbility: account.caregiverReported?.manualAbility ?? null,
      communicationLevel: account.caregiverReported?.communicationLevel ?? null,
      language: account.caregiverReported?.language ?? "en",
      sessionLengthPreference: account.caregiverReported?.sessionLengthPreference ?? 15,
    },
    calibration: {
      sensitivity: 50,
      deadzone: 25,
      activationMethod: "click",
      neutralPosition: null,
      movementRange: null,
      lastCalibratedAt: null,
    },
    pathId: null,
    pathLevel: null,
    // Backward compatibility fields (legacy naming).
    lipMode: null,
    lipTier: null,
    screenerMetrics: null,
    independentUse: null,
    currentLevel: 0,
    // Backward compatibility field (legacy naming).
    currentStage: 0,
    tutorialPassed: false,
    sessionLengthPreference:
      account.caregiverReported?.sessionLengthPreference ?? 15,
    useDwellActivation: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Framework §3.4 (dwell fallback): resolve the effective activation method for
 * a given profile. Priority:
 *   1. Explicit caregiver override (`profile.useDwellActivation`).
 *   2. Screener evidence — high S3 false-positive rate.
 *   3. Calibration preference.
 *   4. Default "mouth".
 */
export function getEffectiveActivationMethod(profile) {
  if (!profile) return "mouth";
  if (profile.useDwellActivation) return "dwell";
  const s3FP = profile.screenerMetrics?.s3FalsePositives ?? 0;
  const s3Total = profile.screenerMetrics?.s3Total ?? 0;
  if (s3Total > 0 && s3FP / s3Total > 0.3) return "dwell";
  return profile.calibration?.activationMethod === "dwell" ? "dwell" : "mouth";
}

/**
 * Derive a research legacy tier (1..4) from screener metrics, then map to
 * pathId (1 or 2) and pathLevel (1 or 2). Same inputs as PathScreener (S1..S5).
 * Returns pathId, pathLevel, independentUse, rationale, plus legacy lipMode/lipTier.
 */
/**
 * Clamp stored level indices so they sit inside the curriculum band for the
 * user's path (Path 1: 0–2, Path 2: 3–6). Repairs legacy profiles (e.g. Path 2
 * with index 0). Idempotent when already in range.
 */
export function normaliseProfile(profile) {
  if (!profile) return profile;
  const pathId =
    profile.pathId === 1 || profile.pathId === 2
      ? profile.pathId
      : profile.lipMode === 1 || profile.lipMode === 2
      ? profile.lipMode
      : null;
  if (pathId !== 1 && pathId !== 2) return profile;
  const floor = firstStageForMode(pathId);
  const ceiling = lastStageForMode(pathId);
  const current = Number.isFinite(profile.currentLevel)
    ? profile.currentLevel
    : Number.isFinite(profile.currentStage)
    ? profile.currentStage
    : 0;
  const clamped = Math.max(floor, Math.min(ceiling, current));
  const pathLevel =
    profile.pathLevel ??
    derivePathLevelFromLegacyTier(pathId, profile.lipTier ?? null);
  if (
    clamped === current &&
    profile.pathId === pathId &&
    profile.pathLevel === pathLevel &&
    profile.lipMode === pathId
  ) {
    return profile;
  }
  return {
    ...profile,
    pathId,
    pathLevel,
    currentLevel: clamped,
    // Keep legacy fields in sync until full migration is complete.
    lipMode: pathId,
    currentStage: clamped,
  };
}

export function assignPathProfile(metrics, { skipped = false } = {}) {
  const s3Total = metrics.s3Total || 5;
  const s3Hits = metrics.s3Hits || 0;
  const accuracy = s3Total > 0 ? s3Hits / s3Total : 0;
  const fatigue =
    metrics.s5Round1Ms > 0 && metrics.s5Round2Ms != null
      ? metrics.s5Round2Ms / metrics.s5Round1Ms
      : 1;
  const s4Deviations = metrics.s4Deviations ?? 0;
  const s2HoldMs = metrics.s2HoldMs ?? 0;

  let legacyTier;
  if (accuracy < 0.4 || s2HoldMs < 1500) legacyTier = 1;
  else if (accuracy < 0.8 || fatigue > 1.4) legacyTier = 2;
  else if (s4Deviations > 5 || fatigue > 1.2) legacyTier = 3;
  else legacyTier = 4;

  const pathId = legacyTier <= 2 ? 1 : 2;
  const pathLevel = derivePathLevelFromLegacyTier(pathId, legacyTier);
  const independentUse = !skipped && accuracy >= 0.6 && fatigue <= 1.6;

  const rationale = {
    activationAccuracy: Math.round(accuracy * 100),
    fatigueRatio: Number(fatigue.toFixed(2)),
    s2HoldMs,
    s4Deviations,
    reason:
      accuracy < 0.8 || fatigue > 1.4
        ? "Activation accuracy or fatigue outside Path 2 thresholds."
        : "Activation accuracy and fatigue within Path 2 thresholds.",
  };

  return {
    pathId,
    pathLevel,
    independentUse,
    rationale,
    // Keep legacy naming for compatibility in old consumers.
    lipMode: pathId,
    lipTier: legacyTier,
  };
}
