/**
 * Framework §9.2 + Appendix C: caregiver-initiated export. Produces a JSON
 * payload that contains only derived metrics (no raw video, no biometric
 * templates, no free-text). The format tracks Appendix C's data dictionary:
 *   - User profile (functional, not clinical)
 *   - Calibration snapshot
 *   - Trial log
 *   - Session log
 */

import { getTrialLog, getSessionLog } from "./persistence";

export function buildCaregiverExport({ profile, settings }) {
  const now = new Date().toISOString();
  return {
    exportedAt: now,
    schemaVersion: "easeL-export-1.0",
    userProfile: {
      language: profile?.caregiverReported?.language ?? "en",
      pathId: profile?.pathId ?? profile?.lipMode ?? null,
      pathLevel: profile?.pathLevel ?? null,
      currentLevel: profile?.currentLevel ?? profile?.currentStage ?? 0,
      // Legacy compatibility fields kept for older dashboards.
      lipMode: profile?.lipMode ?? null,
      lipTier: profile?.lipTier ?? null,
      independentUse: profile?.independentUse ?? null,
      currentStage: profile?.currentStage ?? 0,
      eligibilityPassed: profile?.eligibilityPassed ?? null,
      tutorialPassed: profile?.tutorialPassed ?? null,
      sessionLengthPreference: profile?.sessionLengthPreference ?? null,
      useDwellActivation: profile?.useDwellActivation ?? false,
      caregiverReported: profile?.caregiverReported ?? null,
      screenerMetrics: profile?.screenerMetrics ?? null,
    },
    calibration: profile?.calibration
      ? {
          activationMethod: profile.calibration.activationMethod ?? null,
          sensitivity: profile.calibration.sensitivity ?? null,
          deadzone: profile.calibration.deadzone ?? null,
          neutralPosition: profile.calibration.neutralPosition ?? null,
          movementRange: profile.calibration.movementRange ?? null,
          lastCalibratedAt: profile.calibration.lastCalibratedAt ?? null,
        }
      : null,
    accessibilitySettings: settings
      ? {
          headSensitivity: settings.headSensitivity ?? null,
          gestureSensitivity: settings.gestureSensitivity ?? null,
          deadZone: settings.deadZone ?? null,
          audioFeedback: settings.audioFeedback ?? null,
          highContrast: settings.highContrast ?? null,
        }
      : null,
    trialLog: getTrialLog(),
    sessionLog: getSessionLog(),
    disclaimer:
      "EaseL is not a medical device. This export contains only derived " +
      "performance metrics — no raw video, audio, or biometric templates.",
  };
}

export function downloadCaregiverExport(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    `easeL-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
