import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getProfile,
  setProfile as persistProfile,
  getSettings,
  setSettings as persistSettings,
  getCalibration,
  setCalibration as persistCalibration,
} from "../utils/persistence";
import { useAuth } from "./AuthContext";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const { user, profile: authProfile, updateProfile: authUpdateProfile } = useAuth();
  const [localProfile, setLocalProfile] = useState(getProfile);
  const [settings, setSettingsState] = useState(getSettings);
  const [calibration, setCalibrationState] = useState(getCalibration);
  const [hydrated, setHydrated] = useState(false);
  /** Session-only override for testing: null = use profile, 1 = simulate Intent Capture, 2 = simulate Guided Control */
  const [modeOverride, setModeOverride] = useState(null);

  const profile = user && authProfile != null ? authProfile : localProfile;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const effectiveLipMode = modeOverride !== null ? modeOverride : (profile?.lipMode ?? null);

  const setProfile = useCallback(
    (next) => {
      const updated = typeof next === "function" ? next(profile) : next;
      if (user && authUpdateProfile) {
        authUpdateProfile(updated);
      } else {
        const persisted = persistProfile(updated);
        setLocalProfile(persisted);
      }
    },
    [user, profile, authUpdateProfile]
  );

  const setSettings = (next) => {
    const updated = persistSettings(typeof next === "function" ? next(settings) : next);
    setSettingsState(updated);
  };

  const setCalibration = (next) => {
    const updated = persistCalibration(typeof next === "function" ? next(calibration) : next);
    setCalibrationState(updated);
  };

  const value = {
    profile,
    settings,
    calibration,
    hydrated,
    setProfile,
    setSettings,
    setCalibration,
    modeOverride,
    setModeOverride,
    effectiveLipMode,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
