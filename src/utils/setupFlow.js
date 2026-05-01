/**
 * Setup flow: Calibration → Tutorial → Screener → Home.
 * Returns the path the user should go to next when setup is incomplete.
 */
export const SETUP_ROUTES = ["/calibration", "/tutorial", "/screener"];

/** Routes that caregivers can reach from any stage (settings-driven recalibration etc.) */
export const CAREGIVER_ROUTES = ["/settings", "/profile"];

export function getNextSetupStep(profile) {
  if (!profile) return "/calibration";
  if (!profile.calibration?.lastCalibratedAt) return "/calibration";
  if (!profile.tutorialPassed) return "/tutorial";
  const pathId =
    profile.pathId === 1 || profile.pathId === 2
      ? profile.pathId
      : profile.lipMode;
  if (pathId == null) return "/screener";
  return "/home";
}

export function isSetupComplete(profile) {
  return getNextSetupStep(profile) === "/home";
}

/** True if the path is part of the onboarding flow (calibration..screener). */
export function isSetupRoute(pathname) {
  return SETUP_ROUTES.includes(pathname);
}
