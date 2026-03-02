/**
 * Shared hook: screener-style cursor movement using calibration (tilt, turn, neutral).
 * Use this on any page that should match the LIPScreener / calibration experience.
 *
 * Returns refs and an updater so you can:
 * 1. Pass cursorPosRef to useGestureControl so hit-test and pen toggle use the same position.
 * 2. In your face onResults: call updateCursorFromLandmarks(landmarks), then processLandmarks(landmarks, isPenDown).
 * 3. Sync cursorPosRef to a Cursor component via requestAnimationFrame (see LIPScreener).
 */

import { useRef, useCallback } from "react";
import {
  updatePositionTiltWithCalibration,
  createTiltStateWithCalibration,
} from "../utils/cursorMappings";

function getInitialPosition() {
  if (typeof window === "undefined") return { x: 400, y: 300 };
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

export function useCalibratedCursor(profile) {
  const cursorPosRef = useRef(getInitialPosition());
  const tiltStateRef = useRef(createTiltStateWithCalibration());
  const calibrationRef = useRef(profile?.calibration ?? null);
  calibrationRef.current = profile?.calibration ?? null;

  const updateCursorFromLandmarks = useCallback((landmarks) => {
    updatePositionTiltWithCalibration(
      landmarks,
      cursorPosRef,
      tiltStateRef,
      calibrationRef.current
    );
  }, []);

  return {
    cursorPosRef,
    tiltStateRef,
    calibrationRef,
    updateCursorFromLandmarks,
  };
}
