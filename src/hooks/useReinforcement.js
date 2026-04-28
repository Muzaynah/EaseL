import { useCallback, useRef, useState } from "react";
import { playSuccessBeep } from "../utils/screenerAudio";

/**
 * Mandatory reinforcement per framework §8.3.
 * Fires audio + visual burst after every completed attempt regardless of accuracy.
 *   const { active, trigger, sessionEvents } = useReinforcement({ audio: true });
 * Pass `active` to <ReinforcementBurst active={active} ... />.
 */
export function useReinforcement({ audio = true, durationMs = 1200 } = {}) {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef(null);
  const eventsRef = useRef(0);

  const trigger = useCallback(() => {
    eventsRef.current += 1;
    if (audio) {
      try {
        playSuccessBeep();
      } catch {
        // ignore
      }
    }
    setActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setActive(false), durationMs);
  }, [audio, durationMs]);

  return {
    active,
    trigger,
    get eventsFired() {
      return eventsRef.current;
    },
  };
}
