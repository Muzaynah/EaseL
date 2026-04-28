/**
 * Local persistence for profile, settings, calibration, and logs.
 * Merge with defaults on read; persist on write (localStorage).
 */

export const PROFILE = "easeL_profile";
export const SETTINGS = "easeL_settings";
export const CALIBRATION = "easeL_calibration";
export const TRIAL_LOG = "easeL_trialLog";
export const SESSION_LOG = "easeL_sessionLog";
export const CANVAS_PROJECTS = "easeL_canvasProjects";
export const GALLERY = "easeL_gallery";
export const TELEMETRY_LOG = "easeL_telemetryLog";

const defaultProfile = {
  eligibilityPassed: null,
  pathId: null,
  pathLevel: null,
  lipMode: null,
  lipTier: null,
  independentUse: null,
  screenerMetrics: null,
  currentLevel: 0,
  currentStage: 0,
  sessionLengthPreference: 15,
  useDwellActivation: false,
  tutorialPassed: false,
};

const defaultSettings = {
  autoSave: true,
  soundEffects: true,
  headSensitivity: 75,
  gestureSensitivity: 50,
  deadZone: 25,
  // Framework §3.3 — 0 disables rolling-neutral recalibration, 100 is
  // aggressive.  25 is a gentle default that catches slow drift without
  // interfering with deliberate strokes.
  rollingNeutralStrength: 25,
  audioFeedback: true,
  highContrast: false,
  brushSize: "M",
  defaultBrushColor: "#000000",
  canvasBg: "white",
  layers: false,
  activationMethod: "click",
};

const defaultCalibration = {
  sensitivity: 50,
  deadzone: 25,
  activationMethod: "click",
  neutralPosition: null,
  movementRange: null,
  lastCalibratedAt: null,
};

function read(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    const parsed = JSON.parse(raw);
    return typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)
      ? { ...defaultValue, ...parsed }
      : parsed;
  } catch {
    return defaultValue;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("persistence write failed:", key, e);
  }
}

export function getProfile() {
  return read(PROFILE, defaultProfile);
}

export function setProfile(profile) {
  const merged = { ...defaultProfile, ...profile };
  write(PROFILE, merged);
  return merged;
}

export function getSettings() {
  return read(SETTINGS, defaultSettings);
}

export function setSettings(settings) {
  const merged = { ...defaultSettings, ...settings };
  write(SETTINGS, merged);
  return merged;
}

export function getCalibration() {
  return read(CALIBRATION, defaultCalibration);
}

export function setCalibration(calibration) {
  const merged = { ...defaultCalibration, ...calibration };
  write(CALIBRATION, merged);
  return merged;
}

export function getTrialLog() {
  const value = read(TRIAL_LOG, []);
  return Array.isArray(value) ? value : [];
}

export function appendTrialLog(entry) {
  const log = getTrialLog();
  log.push({ ...entry, timestamp: entry.timestamp ?? Date.now() });
  const bounded = log.slice(-800);
  write(TRIAL_LOG, bounded);
  return bounded;
}

export function getTelemetryLog() {
  const value = read(TELEMETRY_LOG, []);
  return Array.isArray(value) ? value : [];
}

export function appendTelemetryLog(entry) {
  const log = getTelemetryLog();
  log.push({ ...entry, timestamp: entry.timestamp ?? Date.now() });
  const bounded = log.slice(-2000);
  write(TELEMETRY_LOG, bounded);
  return bounded;
}

export function clearTelemetryLog() {
  write(TELEMETRY_LOG, []);
  return [];
}

export function getSessionLog() {
  const value = read(SESSION_LOG, []);
  return Array.isArray(value) ? value : [];
}

export function appendSessionLog(entry) {
  const log = getSessionLog();
  log.push({ ...entry, timestamp: entry.timestamp ?? Date.now() });
  const bounded = log.slice(-400);
  write(SESSION_LOG, bounded);
  return bounded;
}
