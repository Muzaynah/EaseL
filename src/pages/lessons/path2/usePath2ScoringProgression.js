import { useCallback, useState } from "react";
import {
  STAGE_UNLOCK_ADHERENCE,
  didTrialPass,
  evaluateMastery,
  getDynamicRequiredAdherence,
  getMasteryFeedback,
  maybeAdvanceStage,
} from "../../../utils/stageAdaptation";
import { appendTrialLog, getTrialLog } from "../../../utils/persistence";
import { getStage } from "../../../utils/lessonContent";
import {
  buildVertexQualityFills,
  effectiveScoringWidth,
  normalizePathToSegmentStart,
  qualityTierFromDistance,
} from "./traceUtils";
import { computePathAccuracy } from "../../../utils/corridorGeometry";

export function usePath2ScoringProgression({
  user,
  stage,
  attempt,
  adaptedStage,
  activationMethod,
  profile,
  updateProfile,
  searchParams,
  corridorRef,
  currentSegmentRef,
  userPathRef,
  adherence,
  startTsRef,
  segmentResultsRef,
  activationErrorsRef,
  mouthEventsRef,
  jitterSamplesRef,
  completedSegmentsRef,
  railVertexDistRef,
  segmentsFor,
  segmentIndexRef,
  maxProjIdxRef,
  guideIdxRef,
  debugSamplesRef,
  stallFramesRef,
  lastHeadCanvasPosRef,
  reachedHalfwayRef,
  setAdherence,
  setFinishedPayload,
  setPhase,
  setMasteryToast,
}) {
  const [masteryHint, setMasteryHint] = useState("");

  const computeSegmentResult = useCallback(() => {
    const path = [...userPathRef.current];
    const seg = currentSegmentRef.current;
    const c = corridorRef.current;
    if (!seg || !c || !path.length) {
      return {
        invalid: true,
        adherence: Math.max(20, adherence || 0),
        meanDev: c?.width ?? 0,
        duration: 0,
        points: 1,
        insideCount: 0,
        outsideCount: 1,
      };
    }
    const normalizedPath = normalizePathToSegmentStart(path, seg);
    const miniCorridor = {
      centerline: seg.centerline,
      width: effectiveScoringWidth(c.width),
    };
    const acc = computePathAccuracy(normalizedPath, miniCorridor);
    const duration = startTsRef.current != null ? Date.now() - startTsRef.current : 0;
    return {
      adherence: acc.adherence,
      meanDev: acc.meanDeviation,
      duration,
      points: normalizedPath.length,
      insideCount: acc.insideCount,
      outsideCount: acc.outsideCount,
    };
  }, [userPathRef, currentSegmentRef, corridorRef, adherence, startTsRef]);

  const finishAttempt = useCallback(() => {
    const c = corridorRef.current;
    if (!c) return;
    const results = segmentResultsRef.current;
    if (!results.length) return;

    const totalPoints = results.reduce((s, r) => s + r.points, 0) || 1;
    const weightedAdh =
      results.reduce((s, r) => s + r.adherence * r.points, 0) / totalPoints;
    const weightedMeanDev =
      results.reduce((s, r) => s + r.meanDev * r.points, 0) / totalPoints;
    const totalDuration = results.reduce((s, r) => s + r.duration, 0);
    const finalAdherence = Math.max(0, Math.min(100, Math.round(weightedAdh)));
    const stageTrialsBefore = getTrialLog().filter(
      (t) =>
        t.userId === (user?.uid ?? "local") &&
        t.mode === 2 &&
        t.stage === stage.stage,
    );
    const requiredAd = getDynamicRequiredAdherence(stage, stageTrialsBefore);
    const unlockQualified = finalAdherence >= STAGE_UNLOCK_ADHERENCE;
    // True when the next stage is already accessible (was unlocked on a prior attempt)
    const alreadyUnlocked = (profile?.currentStage ?? 0) > stage.stage;
    const totalOut = results.reduce((s, r) => s + (r.outsideCount ?? 0), 0);
    const totalIn = results.reduce((s, r) => s + (r.insideCount ?? 0), 0);
    const offPathPercent =
      totalPoints > 0 ? Math.round((totalOut / totalPoints) * 100) : 0;
    const jitter =
      jitterSamplesRef.current.length > 0
        ? jitterSamplesRef.current.reduce((a, b) => a + b, 0) /
          jitterSamplesRef.current.length
        : 0;
    const targetMasteryAttempts = Math.max(1, stage.trialsForMastery ?? 5);
    const beforeWindow = stageTrialsBefore.slice(-targetMasteryAttempts);
    const masteryBefore = beforeWindow.filter((t) => didTrialPass(t, stage)).length;

    appendTrialLog({
      userId: user?.uid ?? "local",
      mode: 2,
      stage: stage.stage,
      attempt: attempt + 1,
      shape: c.type,
      segments: results.length,
      durationMs: totalDuration,
      adherence: finalAdherence,
      meanDeviation: Number(weightedMeanDev.toFixed(2)),
      jitter: Number(jitter.toFixed(5)),
      activationErrors: activationErrorsRef.current,
      mouthEvents: mouthEventsRef.current,
      requiredAdherence: requiredAd,
      success: finalAdherence >= requiredAd,
      activationMethod,
      assistance: {
        corridorWidth: effectiveScoringWidth(c.width),
        autocompleteLevel: adaptedStage.autocompleteLevel,
      },
    });

    let newUnlock = null;
    const pinnedStage = searchParams.get("lockStage") === "1";
    if (!pinnedStage && updateProfile) {
      const next = maybeAdvanceStage({
        profile,
        trialLog: getTrialLog(),
        userId: user?.uid ?? "local",
      });
      if (next != null && next > (profile?.currentStage ?? 0) && next <= 6) {
        const nextStageDef = getStage(next);
        updateProfile({ ...profile, currentStage: next, currentLevel: next });
        const unlockedTitle = nextStageDef?.title ?? `Stage ${next}`;
        setMasteryToast(unlockedTitle);
        newUnlock = { stage: next, title: unlockedTitle };
      }
    }

    setFinishedPayload({
      adherence: finalAdherence,
      meanDev: weightedMeanDev,
      duration: totalDuration,
      offPathCount: totalOut,
      onPathCount: totalIn,
      totalSamples: totalPoints,
      offPathPercent,
      requiredAdherence: requiredAd,
      passed: finalAdherence >= requiredAd,
      unlockQualified,
      alreadyUnlocked,
      unlock: newUnlock,
      adaptation: adaptedStage._adaptation ?? null,
      masteryProgress: {
        before: masteryBefore,
        after: Math.min(
          targetMasteryAttempts,
          [...stageTrialsBefore, { adherence: finalAdherence, success: finalAdherence >= requiredAd }]
            .slice(-targetMasteryAttempts)
            .filter((t) => didTrialPass(t, stage)).length,
        ),
        target: targetMasteryAttempts,
      },
    });
    setPhase("reward");

    const staged = getTrialLog().filter(
      (t) =>
        t.userId === (user?.uid ?? "local") &&
        t.mode === 2 &&
        t.stage === stage.stage,
    );
    const mastery = evaluateMastery(stage, staged);
    setMasteryHint(getMasteryFeedback(stage, mastery));
  }, [
    corridorRef,
    segmentResultsRef,
    user?.uid,
    stage,
    attempt,
    jitterSamplesRef,
    activationErrorsRef,
    mouthEventsRef,
    activationMethod,
    adaptedStage,
    searchParams,
    updateProfile,
    profile,
    setMasteryToast,
    setFinishedPayload,
    setPhase,
  ]);

  const completeSegment = useCallback(() => {
    const seg = currentSegmentRef.current;
    if (!seg) return;
    const result = computeSegmentResult();
    if (result.invalid) {
      setMasteryHint("We could not score this line clearly. Try starting from the green dot.");
    }
    segmentResultsRef.current.push(result);
    const thD = effectiveScoringWidth(corridorRef.current?.width ?? 24) / 2;
    const L = seg.centerline.length;
    const vq = buildVertexQualityFills(railVertexDistRef.current, thD, L);
    const vertexTiers = vq.map((v) => qualityTierFromDistance(v.dist, v.threshold));
    completedSegmentsRef.current.push({
      centerline: seg.centerline,
      vertexTiers,
    });

    const segs = segmentsFor(corridorRef.current);
    const nextIndex = segmentIndexRef.current + 1;

    userPathRef.current = [];
    maxProjIdxRef.current = 0;
    guideIdxRef.current = 0;
    startTsRef.current = null;
    debugSamplesRef.current = [];
    stallFramesRef.current = 0;
    lastHeadCanvasPosRef.current = null;
    reachedHalfwayRef.current = false;
    railVertexDistRef.current = null;

    if (nextIndex >= segs.length) {
      finishAttempt();
      return;
    }

    const runningAdh =
      segmentResultsRef.current.reduce((s, r) => s + r.adherence * r.points, 0) /
      Math.max(1, segmentResultsRef.current.reduce((s, r) => s + r.points, 0));
    setAdherence(Math.round(runningAdh));
    return nextIndex;
  }, [
    currentSegmentRef,
    computeSegmentResult,
    segmentResultsRef,
    corridorRef,
    railVertexDistRef,
    completedSegmentsRef,
    segmentsFor,
    segmentIndexRef,
    userPathRef,
    maxProjIdxRef,
    guideIdxRef,
    startTsRef,
    debugSamplesRef,
    stallFramesRef,
    lastHeadCanvasPosRef,
    reachedHalfwayRef,
    finishAttempt,
    setAdherence,
  ]);

  return {
    masteryHint,
    setMasteryHint,
    computeSegmentResult,
    finishAttempt,
    completeSegment,
  };
}
