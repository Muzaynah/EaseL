import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Framework §6.2: session-length cap + scheduled breaks.
 *   Initial sessions: 5-10 min
 *   Standard:         15-30 min
 *   Extended:         up to 60 min (with caregiver agreement)
 * Caregiver chooses the cap via `profile.sessionLengthPreference` (minutes).
 *
 * This hook fires two events:
 *   - onBreakPrompt() every `breakIntervalMs` (default 5 min) while active.
 *   - onSessionCap() when the total elapsed reaches the cap.
 * Caller owns the UI; this hook only tracks time and toggles state.
 */
export function useSessionTimer({
  capMinutes = 15,
  breakIntervalMs = 5 * 60 * 1000,
  enabled = true,
} = {}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [capped, setCapped] = useState(false);
  const startRef = useRef(null);
  const lastBreakRef = useRef(0);
  const accumulatedRef = useRef(0);
  const capMs = Math.max(1, capMinutes) * 60 * 1000;

  useEffect(() => {
    if (!enabled || onBreak || capped) return;
    if (startRef.current == null) startRef.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const current = accumulatedRef.current + (now - (startRef.current ?? now));
      setElapsedMs(current);
      if (current >= capMs) {
        setCapped(true);
      } else if (current - lastBreakRef.current >= breakIntervalMs) {
        lastBreakRef.current = current;
        accumulatedRef.current = current;
        startRef.current = performance.now();
        setOnBreak(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, onBreak, capped, breakIntervalMs, capMs]);

  const pause = useCallback(() => {
    if (startRef.current != null) {
      accumulatedRef.current += performance.now() - startRef.current;
      startRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (startRef.current == null) startRef.current = performance.now();
  }, []);

  const endBreak = useCallback(() => {
    setOnBreak(false);
    startRef.current = performance.now();
  }, []);

  const reset = useCallback(() => {
    setElapsedMs(0);
    setOnBreak(false);
    setCapped(false);
    accumulatedRef.current = 0;
    lastBreakRef.current = 0;
    startRef.current = performance.now();
  }, []);

  return { elapsedMs, onBreak, capped, pause, resume, endBreak, reset };
}
