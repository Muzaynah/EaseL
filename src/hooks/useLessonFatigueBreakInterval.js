import { useMemo } from "react";
import { getTrialLog } from "../utils/persistence";
import { computeFatigueIndex } from "../utils/stageAdaptation";

/**
 * Shorter break intervals when recent trials show fatigue (Path 1 + Path 2).
 */
export function useLessonFatigueBreakInterval(userUid) {
  return useMemo(() => {
    const recent = (typeof window !== "undefined" ? getTrialLog() : []).slice(-10);
    const fatigue = computeFatigueIndex(recent);
    if (fatigue >= 0.5) return 3 * 60 * 1000;
    if (fatigue >= 0.25) return 4 * 60 * 1000;
    return 5 * 60 * 1000;
  }, [userUid]);
}
