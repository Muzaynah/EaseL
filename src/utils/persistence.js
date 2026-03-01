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

const defaultProfile = {
  eligibilityPassed: null,
  lipMode: null,
  lipTier: null,
  currentStage: 0,
  sessionLengthPreference: 15,
  useDwellActivation: false,
  tutorialPassed: false,
};

const defaultSettings = {
  theme: "light",
  autoSave: true,
  soundEffects: true,
  headSensitivity: 75,
  gestureSensitivity: 50,
  deadZone: 25,
  audioFeedback: true,
  highContrast: false,
  brushSize: "M",
  canvasBg: "white",
  layers: false,
  profileVisibility: "private",
  dataCollection: false,
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
  write(TRIAL_LOG, log);
  return log;
}

export function getSessionLog() {
  const value = read(SESSION_LOG, []);
  return Array.isArray(value) ? value : [];
}

export function appendSessionLog(entry) {
  const log = getSessionLog();
  log.push({ ...entry, timestamp: entry.timestamp ?? Date.now() });
  write(SESSION_LOG, log);
  return log;
}
