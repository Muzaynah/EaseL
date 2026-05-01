/**
 * Persistence for settings/calibration and cloud-backed logs.
 * Profile and progression are cloud-only via AuthContext/Firestore.
 */
import { auth } from "../firebase/config";
import {
  appendCloudLog,
  isFirestorePermissionError,
  listCloudLogs,
} from "../firebase/cloudData";

export const SETTINGS = "easeL_settings";
export const CALIBRATION = "easeL_calibration";
export const TRIAL_LOG = "easeL_trialLog";
export const SESSION_LOG = "easeL_sessionLog";
export const CANVAS_PROJECTS = "easeL_canvasProjects";
export const GALLERY = "easeL_gallery";
export const TELEMETRY_LOG = "easeL_telemetryLog";
const MAX_TRIAL = 800;
const MAX_SESSION = 400;
const MAX_TELEMETRY = 2000;

const runtimeLogs = {
  trial: [],
  session: [],
  telemetry: [],
  hydratedUid: null,
  loadState: "idle", // idle | loading | ready | denied | network
};
const cloudLogWriteDisabled = {
  trialLogs: false,
  sessionLogs: false,
  telemetryLogs: false,
};

function handleCloudLogError(type, e, context) {
  if (isFirestorePermissionError(e)) {
    if (!cloudLogWriteDisabled[type]) {
      console.warn(
        `[EaseL] ${context}: Firestore permission denied. Cloud log writes disabled for ${type}.`,
      );
    }
    cloudLogWriteDisabled[type] = true;
    return;
  }
  console.warn(`${context}`, e);
}

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
  return runtimeLogs.trial;
}

export function appendTrialLog(entry) {
  const next = { ...entry, timestamp: entry.timestamp ?? Date.now() };
  runtimeLogs.trial = [...runtimeLogs.trial, next].slice(-MAX_TRIAL);
  const uid = auth?.currentUser?.uid ?? entry?.userId ?? null;
  if (uid && !cloudLogWriteDisabled.trialLogs) {
    appendCloudLog(uid, "trialLogs", next).catch((e) =>
      handleCloudLogError("trialLogs", e, "appendTrialLog cloud write failed"),
    );
  }
  return runtimeLogs.trial;
}

export function getTelemetryLog() {
  return runtimeLogs.telemetry;
}

export function appendTelemetryLog(entry) {
  const next = { ...entry, timestamp: entry.timestamp ?? Date.now() };
  runtimeLogs.telemetry = [...runtimeLogs.telemetry, next].slice(-MAX_TELEMETRY);
  const uid = auth?.currentUser?.uid ?? entry?.userId ?? null;
  if (uid && !cloudLogWriteDisabled.telemetryLogs) {
    appendCloudLog(uid, "telemetryLogs", next).catch((e) =>
      handleCloudLogError("telemetryLogs", e, "appendTelemetryLog cloud write failed"),
    );
  }
  return runtimeLogs.telemetry;
}

export function clearTelemetryLog() {
  runtimeLogs.telemetry = [];
  return [];
}

export function getSessionLog() {
  return runtimeLogs.session;
}

export function appendSessionLog(entry) {
  const next = { ...entry, timestamp: entry.timestamp ?? Date.now() };
  runtimeLogs.session = [...runtimeLogs.session, next].slice(-MAX_SESSION);
  const uid = auth?.currentUser?.uid ?? entry?.userId ?? null;
  if (uid && !cloudLogWriteDisabled.sessionLogs) {
    appendCloudLog(uid, "sessionLogs", next).catch((e) =>
      handleCloudLogError("sessionLogs", e, "appendSessionLog cloud write failed"),
    );
  }
  return runtimeLogs.session;
}

export async function hydrateCloudLogs(uid) {
  if (!uid) {
    runtimeLogs.trial = [];
    runtimeLogs.session = [];
    runtimeLogs.telemetry = [];
    runtimeLogs.hydratedUid = null;
    runtimeLogs.loadState = "idle";
    return;
  }
  if (runtimeLogs.hydratedUid === uid) return;
  runtimeLogs.loadState = "loading";
  try {
    const [trial, session, telemetry] = await Promise.all([
      listCloudLogs(uid, "trialLogs", MAX_TRIAL),
      listCloudLogs(uid, "sessionLogs", MAX_SESSION),
      listCloudLogs(uid, "telemetryLogs", MAX_TELEMETRY),
    ]);
    runtimeLogs.trial = trial;
    runtimeLogs.session = session;
    runtimeLogs.telemetry = telemetry;
    runtimeLogs.hydratedUid = uid;
    runtimeLogs.loadState = "ready";
    cloudLogWriteDisabled.trialLogs = false;
    cloudLogWriteDisabled.sessionLogs = false;
    cloudLogWriteDisabled.telemetryLogs = false;
  } catch (e) {
    if (isFirestorePermissionError(e)) {
      runtimeLogs.trial = [];
      runtimeLogs.session = [];
      runtimeLogs.telemetry = [];
      runtimeLogs.hydratedUid = uid;
      runtimeLogs.loadState = "denied";
      cloudLogWriteDisabled.trialLogs = true;
      cloudLogWriteDisabled.sessionLogs = true;
      cloudLogWriteDisabled.telemetryLogs = true;
      console.warn(
        "[EaseL] Cloud logs read blocked by Firestore rules. Logs will stay in-memory for this session.",
      );
      return;
    }
    runtimeLogs.loadState = "network";
    throw e;
  }
}

export function getCloudLogState() {
  return runtimeLogs.loadState;
}
