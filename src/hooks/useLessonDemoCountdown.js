import { useEffect, useRef, useState } from "react";
import { speakInstruction } from "../utils/screenerAudio";
import {
  LESSON_DEMO_COUNTDOWN_STEP_MS,
  LESSON_DEMO_COUNTDOWN_TOTAL_MS,
} from "../constants/lessonCanvas";

/**
 * Spoken 3-2-1 during demo phase; calls `onComplete` when the countdown finishes.
 * Callback refs avoid restarting the interval when parent closures change each render.
 */
export function useLessonDemoCountdown({
  phase,
  muted,
  language,
  onComplete,
  onBeforeCountdown,
  totalMs = LESSON_DEMO_COUNTDOWN_TOTAL_MS,
  stepMs = LESSON_DEMO_COUNTDOWN_STEP_MS,
}) {
  const [countdown, setCountdown] = useState(null);
  const [countdownDeadlineMs, setCountdownDeadlineMs] = useState(null);
  const [countdownNowMs, setCountdownNowMs] = useState(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onBeforeRef = useRef(onBeforeCountdown);
  onBeforeRef.current = onBeforeCountdown;

  useEffect(() => {
    if (phase !== "demo") {
      setCountdown(null);
      setCountdownDeadlineMs(null);
      return undefined;
    }
    onBeforeRef.current?.();
    const deadline = Date.now() + totalMs;
    setCountdownDeadlineMs(deadline);
    setCountdownNowMs(Date.now());
    let current = 3;
    setCountdown(current);
    if (!muted) speakInstruction(String(current), { language });
    const id = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(id);
        setCountdown(null);
        onCompleteRef.current?.();
        return;
      }
      setCountdown(current);
      if (!muted) speakInstruction(String(current), { language });
    }, stepMs);
    return () => clearInterval(id);
  }, [phase, muted, language, totalMs, stepMs]);

  useEffect(() => {
    if (!countdownDeadlineMs) return undefined;
    let raf = 0;
    const tick = () => {
      setCountdownNowMs(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [countdownDeadlineMs]);

  const countdownProgress =
    countdownDeadlineMs != null
      ? Math.max(0, Math.min(1, (countdownDeadlineMs - countdownNowMs) / totalMs))
      : 0;

  return { countdown, countdownDeadlineMs, countdownNowMs, countdownProgress };
}
