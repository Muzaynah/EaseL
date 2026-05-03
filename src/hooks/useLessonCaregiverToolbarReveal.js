import { useCallback, useEffect, useRef, useState } from "react";

export const LESSON_CAREGIVER_TOOLBAR_HIDE_MS = 2400;
export const LESSON_CAREGIVER_MOUSE_REVEAL_DELTA = 24;

/**
 * Path 1 + Path 2: caregiver tools (Troubleshoot, recenter, mute, exit) fade in
 * on mouse movement or keypress, then hide after idle.
 */
export function useLessonCaregiverToolbarReveal() {
  const [caregiverControlsVisible, setCaregiverControlsVisible] = useState(false);
  const caregiverHideTimerRef = useRef(null);
  const caregiverMouseRef = useRef({ x: null, y: null });

  const revealCaregiverControls = useCallback(() => {
    setCaregiverControlsVisible(true);
    if (caregiverHideTimerRef.current) clearTimeout(caregiverHideTimerRef.current);
    caregiverHideTimerRef.current = setTimeout(() => {
      setCaregiverControlsVisible(false);
    }, LESSON_CAREGIVER_TOOLBAR_HIDE_MS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleMouseMove = (e) => {
      const prev = caregiverMouseRef.current;
      if (prev.x == null || prev.y == null) {
        caregiverMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const moved = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      caregiverMouseRef.current = { x: e.clientX, y: e.clientY };
      if (moved >= LESSON_CAREGIVER_MOUSE_REVEAL_DELTA) {
        revealCaregiverControls();
      }
    };
    const handleKeyboardIntent = () => revealCaregiverControls();

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("keydown", handleKeyboardIntent);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyboardIntent);
      if (caregiverHideTimerRef.current) clearTimeout(caregiverHideTimerRef.current);
    };
  }, [revealCaregiverControls]);

  return { caregiverControlsVisible, revealCaregiverControls };
}
