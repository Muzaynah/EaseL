/**
 * Profile schema: one per account, stored in Firestore.
 * Combines identity, caregiver-reported details, and app-derived state.
 */

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
    eligibilityPassed: null,
    calibration: {
      sensitivity: 50,
      deadzone: 25,
      activationMethod: "click",
      neutralPosition: null,
      movementRange: null,
      lastCalibratedAt: null,
    },
    lipMode: null,
    lipTier: null,
    screenerMetrics: null,
    currentStage: 0,
    tutorialPassed: false,
    createdAt: now,
    updatedAt: now,
  };
}
