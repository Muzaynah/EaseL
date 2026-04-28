/**
 * Shared hook: screener-style cursor movement using calibration (tilt, turn, neutral).
 * Uses Settings headSensitivity and deadZone so changes take effect after Save.
 *
 * Returns refs and an updater so you can:
 * 1. Pass cursorPosRef to useGestureControl so hit-test and pen toggle use the same position.
 * 2. In your face onResults: call updateCursorFromLandmarks(landmarks), then processLandmarks(landmarks, isPenDown).
 * 3. Sync cursorPosRef to a Cursor component via requestAnimationFrame (see PathScreener).
 */

import { useRef, useCallback } from "react";
import {
  updatePositionTiltWithCalibration,
  createTiltStateWithCalibration,
} from "../utils/cursorMappings";
import { useAppState } from "../context/AppStateContext";

function getInitialPosition() {
  if (typeof window === "undefined") return { x: 400, y: 300 };
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

export function useCalibratedCursor(profile, settingsFromProps) {
  const { settings: contextSettings } = useAppState();
  const settings = settingsFromProps ?? contextSettings ?? {};
  const cursorPosRef = useRef(getInitialPosition());
  const tiltStateRef = useRef(createTiltStateWithCalibration());
  const calibrationRef = useRef(profile?.calibration ?? null);
  calibrationRef.current = profile?.calibration ?? null;
  // Lesson screens flip this to `true` while the user is mid-stroke / mid-trial
  // so the rolling neutral doesn't re-center toward the intentional tilt.
  // Framework §3.3 recalibration is meant to catch long-term resting drift,
  // not correct deliberate movement within an attempt.
  const freezeRecalibrationRef = useRef(false);

  const updateCursorFromLandmarks = useCallback((landmarks) => {
    updatePositionTiltWithCalibration(
      landmarks,
      cursorPosRef,
      tiltStateRef,
      calibrationRef.current,
      {
        headSensitivity: settings?.headSensitivity ?? 75,
        deadZone: settings?.deadZone ?? 25,
        rollingNeutralStrength: settings?.rollingNeutralStrength ?? 25,
        freezeRecalibration: freezeRecalibrationRef.current,
      }
    );
  }, [
    settings?.headSensitivity,
    settings?.deadZone,
    settings?.rollingNeutralStrength,
  ]);

  return {
    cursorPosRef,
    tiltStateRef,
    calibrationRef,
    freezeRecalibrationRef,
    updateCursorFromLandmarks,
  };
}
