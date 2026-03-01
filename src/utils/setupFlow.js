/**
 * Setup flow: Eligibility → Calibration → Tutorial → Screener → Home.
 * Returns the path the user should go to next when setup is incomplete.
 */
export const SETUP_ROUTES = ["/eligibility", "/calibration", "/tutorial", "/screener"];

export function getNextSetupStep(profile) {
  if (!profile) return "/eligibility";
  if (profile.eligibilityPassed === null) return "/eligibility";
  if (profile.eligibilityPassed === false) return "/home";
  if (!profile.calibration?.lastCalibratedAt) return "/calibration";
  if (!profile.tutorialPassed) return "/tutorial";
  if (profile.lipMode == null) return "/screener";
  return "/home";
}

export function isSetupComplete(profile) {
  return getNextSetupStep(profile) === "/home";
}
