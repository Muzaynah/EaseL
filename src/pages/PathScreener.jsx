import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useGestureControl } from "../hooks/useGestureControl";
import { useAppState } from "../context/AppStateContext";
import { useAuth } from "../context/AuthContext";
import { playSuccessBeep, playErrorBeep, speakInstruction, stopSpeech } from "../utils/screenerAudio";
import { updatePositionTiltWithCalibration, createTiltStateWithCalibration } from "../utils/cursorMappings";
import { assignPathProfile } from "../utils/profileSchema";
import { firstStageForMode } from "../utils/lessonContent";
import Cursor from "../components/Cursor";
import PathScreenerStepAnimation from "../components/PathScreenerStepAnimation";
import SetupFailureCard from "../components/SetupFailureCard";
import { Check, Volume2, HelpCircle, X, Target, Route } from "lucide-react";

function getPathLevelCopy(pathId, pathLevel) {
  if (pathId === 1) {
    return {
      pathName: "Path 1 (Intent Assist)",
      levelLabel: pathLevel === 1 ? "Level 1" : "Level 2",
      fullLabel: `Path 1 - ${pathLevel === 1 ? "Level 1" : "Level 2"}`,
    };
  }
  return {
    pathName: "Path 2 (Guided Control)",
    levelLabel: pathLevel === 1 ? "Level 1" : "Level 2",
    fullLabel: `Path 2 - ${pathLevel === 1 ? "Level 1" : "Level 2"}`,
  };
}

export default function PathScreener() {
  const navigate = useNavigate();
  const { setProfile, settings } = useAppState();
  const { profile } = useAuth();
  const videoRef = useRef(null);
  const cursorPosRef = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 400,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
  });
  const cursorRef = useRef(null);
  const tiltStateRef = useRef(createTiltStateWithCalibration());
  const calibrationRef = useRef(null);
  calibrationRef.current = profile?.calibration ?? null;
  const buttonRefs = useRef({});
  const [step, setStep] = useState(1);
  const [metrics, setMetrics] = useState({
    s1ReactionMs: null,
    s2HoldMs: null,
    s3Hits: 0,
    s3Total: 5,
    s4TimeMs: null,
    s4Deviations: 0,
    s5Round1Ms: null,
    s5Round2Ms: null,
  });
  const step1ShownAt = useRef(null);
  const s2AccumRef = useRef(0);
  const s2LastEnterRef = useRef(null);
  const [s2Progress, setS2Progress] = useState(0);
  const [s3Selected, setS3Selected] = useState(() => new Set());
  const s4StartRef = useRef(null);
  const [s4Done, setS4Done] = useState(false);
  const [s5Phase, setS5Phase] = useState(1);
  const [s5Round1Selected, setS5Round1Selected] = useState(() => new Set());
  const [s5Round2Selected, setS5Round2Selected] = useState(() => new Set());
  const [s5Round1Start, setS5Round1Start] = useState(null);
  const [s5Round2Start, setS5Round2Start] = useState(null);
  const [finished, setFinished] = useState(false);
  const [instructionAcknowledged, setInstructionAcknowledged] = useState(false);
  const [dialogFading, setDialogFading] = useState(false);
  const [cursorHoverId, setCursorHoverId] = useState(null);
  const [s5Round2Transition, setS5Round2Transition] = useState(false);
  const [showTaskComplete, setShowTaskComplete] = useState(false);
  const prevStepRef = useRef(1);
  const screenerCompletedRef = useRef(false);
  const pendingProfileSaveRef = useRef(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [failedLevel, setFailedLevel] = useState(false);
  const [, setS2FailedAttempts] = useState(0);
  const [anySkipped, setAnySkipped] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const s2HadProgressRef = useRef(false);
  const s2WasInsideRef = useRef(false);
  const s4OutOfBoundsFeedbackCooldownRef = useRef(0);
  const FAILED_STABILIZATION_ATTEMPTS = 3;
  const S4_MAX_DEVIATIONS_BEFORE_FAIL = 15;
  const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 400;
  const centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 300;
  const zoneR = 100;
  const corridorY = centerY;
  const corridorH = 160;
  const corridorLeft = 80;
  const corridorRight = typeof window !== "undefined" ? window.innerWidth - 80 : 720;

  const STEP_INSTRUCTIONS = {
    1: "Put the cursor on the green Start button. Open your mouth or click to press it.",
    2: "Keep the cursor inside the circle for 5 seconds.",
    3: "Select each circle. Put the cursor on a circle, then open your mouth or click.",
    4: "Move the cursor from the left to the right. Stay inside the strip.",
    5: "Select the 3 circles. Round one, then round two.",
  };

  const sensitivityOptions = {
    headSensitivity: settings?.headSensitivity ?? 75,
    deadZone: settings?.deadZone ?? 25,
  };

  const processLandmarksRef = useRef(() => {});
  const handleResults = useCallback((results) => {
    try {
      const landmarks = results?.multiFaceLandmarks?.[0];
      updatePositionTiltWithCalibration(landmarks, cursorPosRef, tiltStateRef, calibrationRef.current, sensitivityOptions);
    } catch (e) {
      if (typeof console !== "undefined" && console.warn) console.warn("[EaseL] PathScreener handleResults:", e);
    }
  }, [settings?.headSensitivity, settings?.deadZone]);

  const handleActivate = useCallback((btnId) => {
    if (failedLevel) return;
    if (step === 1) {
      if (btnId === "s1-btn" && step1ShownAt.current) {
        playSuccessBeep();
        setFeedbackMessage("");
        setMetrics((m) => ({ ...m, s1ReactionMs: Date.now() - step1ShownAt.current }));
        setStep(2);
      } else if (btnId && btnId !== "s1-btn") {
        playErrorBeep();
        setFeedbackMessage("Press the green Start button.");
      }
      return;
    }
    if (step === 3) {
      if (btnId?.startsWith("s3-")) {
        const num = parseInt(btnId.replace("s3-", ""), 10);
        if (!Number.isNaN(num)) {
          playSuccessBeep();
          setFeedbackMessage("");
          setS3Selected((prev) => {
            const next = new Set(prev);
            next.add(num);
            return next;
          });
        }
      } else if (btnId) {
        playErrorBeep();
        setFeedbackMessage("Select one of the numbered circles.");
      }
      return;
    }
    if (step === 5 && btnId?.startsWith("s5-")) {
      const num = parseInt(btnId.replace("s5-", ""), 10);
      if (!Number.isNaN(num)) {
        playSuccessBeep();
        setFeedbackMessage("");
        if (s5Phase === 1) {
          setS5Round1Selected((prev) => {
            const next = new Set(prev);
            next.add(num);
            return next;
          });
        } else {
          setS5Round2Selected((prev) => {
            const next = new Set(prev);
            next.add(num);
            return next;
          });
        }
      } else if (btnId) {
        playErrorBeep();
        setFeedbackMessage("Select one of the circles.");
      }
      return;
    }
  }, [step, s5Phase, failedLevel]);

  const handleActivateOutside = useCallback(() => {
    if (failedLevel) return;
    if (step === 3 || step === 5) {
      playErrorBeep();
      setFeedbackMessage("Put the cursor on a circle, then open your mouth or click.");
    }
  }, [step, failedLevel]);

  const { processLandmarks } = useGestureControl({
    onPenToggle: () => {},
    onButtonHover: setCursorHoverId,
    onButtonClick: handleActivate,
    onActivateOutside: handleActivateOutside,
    buttonRefs,
    cursorPosRef,
    mouthOpenThreshold: 0.022,
    framesToConfirm: 1,
    cooldownMs: 200,
  });
  processLandmarksRef.current = processLandmarks;

  const onFaceResults = useCallback((results) => {
    try {
      handleResults(results);
      const landmarks = results?.multiFaceLandmarks?.[0];
      if (landmarks && typeof processLandmarksRef.current === "function") {
        processLandmarksRef.current(landmarks, false);
      }
    } catch (e) {
      if (typeof console !== "undefined" && console.warn) console.warn("[EaseL] PathScreener onFaceResults:", e);
    }
  }, [handleResults]);

  const { startFaceMesh } = useFaceMesh({ videoRef, onResults: onFaceResults });

  useEffect(() => {
    if (instructionAcknowledged && step === 1) step1ShownAt.current = Date.now();
  }, [instructionAcknowledged, step]);

  useEffect(() => {
    setFeedbackMessage("");
    setInstructionAcknowledged(false);
    setDialogFading(false);
    if (step > 1 && step !== prevStepRef.current) {
      setShowTaskComplete(true);
      prevStepRef.current = step;
    }
  }, [step]);

  useEffect(() => {
    if (!showTaskComplete) return;
    const t = setTimeout(() => setShowTaskComplete(false), 1600);
    return () => clearTimeout(t);
  }, [showTaskComplete]);

  useEffect(() => {
    if (!feedbackMessage) return;
    const t = setTimeout(() => setFeedbackMessage(""), 3500);
    return () => clearTimeout(t);
  }, [feedbackMessage]);

  const fadeTimeoutRef = useRef(null);
  useEffect(() => {
    const text = STEP_INSTRUCTIONS[step];
    if (!text) return;
    if (showTaskComplete) return;
    speakInstruction(text, {
      onEnd: () => {
        setDialogFading(true);
        fadeTimeoutRef.current = setTimeout(() => setInstructionAcknowledged(true), 450);
      },
    });
    return () => {
      stopSpeech();
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [step, showTaskComplete]);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  useEffect(() => {
    if (step === 4 && instructionAcknowledged) {
      cursorPosRef.current.x = corridorLeft + 24;
      cursorPosRef.current.y = corridorY;
    }
  }, [step, instructionAcknowledged, corridorLeft, corridorY]);

  useEffect(() => {
    let cleanup;
    const t = setTimeout(() => {
      cleanup = startFaceMesh();
    }, 150);
    return () => {
      clearTimeout(t);
      if (typeof cleanup === "function") cleanup();
    };
  }, [startFaceMesh]);

  useEffect(() => {
    if (step !== 2) return;
    s2AccumRef.current = 0;
    s2LastEnterRef.current = null;
    s2HadProgressRef.current = false;
    s2WasInsideRef.current = false;
    setS2Progress(0);
  }, [step]);

  useEffect(() => {
    if (step !== 2 || !instructionAcknowledged || failedLevel) return;
    const id = setInterval(() => {
      const x = cursorPosRef.current.x;
      const y = cursorPosRef.current.y;
      const dist = Math.hypot(x - centerX, y - centerY);
      const inside = dist <= zoneR;
      const now = Date.now();
      if (inside) {
        if (s2LastEnterRef.current === null) s2LastEnterRef.current = now;
        const elapsed = s2AccumRef.current + (now - s2LastEnterRef.current);
        s2AccumRef.current = elapsed;
        s2LastEnterRef.current = now;
        if (elapsed > 200) s2HadProgressRef.current = true;
        setS2Progress(Math.min(1, elapsed / 5000));
        if (elapsed >= 5000) {
          playSuccessBeep();
          setMetrics((m) => ({ ...m, s2HoldMs: Math.round(elapsed) }));
          setStep(3);
        }
        s2WasInsideRef.current = true;
      } else {
        const justLeft = s2WasInsideRef.current;
        s2WasInsideRef.current = false;
        if (justLeft && s2HadProgressRef.current) {
          setS2FailedAttempts((prev) => {
            const next = prev + 1;
            if (next >= FAILED_STABILIZATION_ATTEMPTS) setFailedLevel(true);
            return next;
          });
          playErrorBeep();
          setFeedbackMessage("Keep the cursor inside the circle. Try again.");
        }
        s2HadProgressRef.current = false;
        s2AccumRef.current = 0;
        s2LastEnterRef.current = null;
        setS2Progress(0);
      }
    }, 50);
    return () => clearInterval(id);
  }, [step, instructionAcknowledged, centerX, failedLevel]);

  useEffect(() => {
    if (step === 3 && s3Selected.size >= 5) {
      setMetrics((m) => ({ ...m, s3Hits: 5 }));
      setStep(4);
    }
  }, [step, s3Selected.size]);

  useEffect(() => {
    if (instructionAcknowledged && step === 4) s4StartRef.current = Date.now();
  }, [instructionAcknowledged, step]);

  // Keep cursor responsive in steps 3–5: reset tilt smoothing when task view is shown for that step
  useEffect(() => {
    if (instructionAcknowledged && (step === 3 || step === 4 || step === 5)) {
      tiltStateRef.current = createTiltStateWithCalibration();
    }
  }, [instructionAcknowledged, step]);

  useEffect(() => {
    if (step !== 4 || !instructionAcknowledged || s4Done || failedLevel) return;
    const id = setInterval(() => {
      if (s4Done) return;
      const x = cursorPosRef.current.x;
      const y = cursorPosRef.current.y;
      if (x >= corridorRight && s4StartRef.current) {
        setMetrics((m) => ({ ...m, s4TimeMs: Date.now() - s4StartRef.current, s4Deviations: m.s4Deviations }));
        setS4Done(true);
        setFeedbackMessage("");
        setStep(5);
      } else {
        const out = Math.abs(y - corridorY) > corridorH / 2;
        if (out) {
          const now = Date.now();
          if (now - s4OutOfBoundsFeedbackCooldownRef.current > 800) {
            s4OutOfBoundsFeedbackCooldownRef.current = now;
            playErrorBeep();
            setFeedbackMessage("Stay inside the strip.");
          }
          setMetrics((m) => {
            const nextDeviations = m.s4Deviations + 1;
            if (nextDeviations >= S4_MAX_DEVIATIONS_BEFORE_FAIL) setFailedLevel(true);
            return { ...m, s4Deviations: nextDeviations };
          });
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [step, instructionAcknowledged, s4Done, corridorY, corridorH, corridorRight, failedLevel]);

  useEffect(() => {
    if (step === 5 && s5Phase === 1 && s5Round1Selected.size === 0 && !s5Round1Start) setS5Round1Start(Date.now());
    if (step === 5 && s5Phase === 1 && s5Round1Selected.size >= 3 && !s5Round2Transition) {
      const t1 = Date.now() - s5Round1Start;
      setMetrics((m) => ({ ...m, s5Round1Ms: t1 }));
      setS5Round2Transition(true);
    }
    if (step === 5 && s5Phase === 2 && s5Round2Selected.size >= 3 && !screenerCompletedRef.current) {
      screenerCompletedRef.current = true;
      const t2 = Date.now() - s5Round2Start;
      const nextMetrics = { ...metrics, s5Round2Ms: t2 };
      const screenerMetrics = {
        s1ReactionMs: nextMetrics.s1ReactionMs,
        s2HoldMs: nextMetrics.s2HoldMs,
        s3Hits: nextMetrics.s3Hits,
        s3Total: nextMetrics.s3Total,
        s4TimeMs: nextMetrics.s4TimeMs,
        s4Deviations: nextMetrics.s4Deviations,
        s5Round1Ms: nextMetrics.s5Round1Ms,
        s5Round2Ms: nextMetrics.s5Round2Ms,
      };
      const { pathId, pathLevel, lipMode, lipTier, independentUse, rationale } = assignPathProfile(
        screenerMetrics,
        { skipped: anySkipped }
      );
      pendingProfileSaveRef.current = {
        pathId,
        pathLevel,
        lipMode,
        lipTier,
        independentUse,
        currentLevel: firstStageForMode(pathId),
        currentStage: firstStageForMode(pathId),
        screenerMetrics,
      };
      setAssignment({
        pathId,
        pathLevel,
        lipMode,
        lipTier,
        independentUse,
        rationale,
        metrics: screenerMetrics,
      });
      setMetrics(nextMetrics);
      setFinished(true);
    }
  }, [step, s5Phase, s5Round1Selected.size, s5Round2Selected.size, s5Round1Start, s5Round2Start, s5Round2Transition, metrics, anySkipped]);

  useEffect(() => {
    if (!s5Round2Transition) return;
    const t = setTimeout(() => {
      setS5Phase(2);
      setS5Round2Selected(new Set());
      setS5Round2Start(Date.now());
      setS5Round2Transition(false);
    }, 2200);
    return () => clearTimeout(t);
  }, [s5Round2Transition]);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (cursorRef.current) {
        cursorRef.current.style.left = cursorPosRef.current.x + "px";
        cursorRef.current.style.top = cursorPosRef.current.y + "px";
      }
    };
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const playInstructionAgain = useCallback(() => {
    const text = STEP_INSTRUCTIONS[step];
    if (text) speakInstruction(text);
  }, [step]);

  const openHelpDialog = useCallback(() => {
    setShowHelpDialog(true);
    const text = STEP_INSTRUCTIONS[step];
    if (text) speakInstruction(text);
  }, [step]);

  const skipTask = useCallback(() => {
    setAnySkipped(true);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setS3Selected(new Set([1, 2, 3, 4, 5]));
      setMetrics((m) => ({ ...m, s3Hits: 5 }));
      setStep(4);
      return;
    }
    if (step === 4) {
      setS4Done(true);
      setStep(5);
      return;
    }
    if (step === 5 && s5Phase === 1) {
      if (!s5Round1Start) setS5Round1Start(Date.now());
      const t1 = Date.now() - (s5Round1Start || Date.now());
      setMetrics((m) => ({ ...m, s5Round1Ms: t1 }));
      setS5Round2Transition(true);
      return;
    }
    if (step === 5 && s5Phase === 2 && !screenerCompletedRef.current) {
      screenerCompletedRef.current = true;
      const t2 = Date.now() - s5Round2Start;
      const nextMetrics = { ...metrics, s5Round2Ms: t2 };
      const screenerMetrics = {
        s1ReactionMs: nextMetrics.s1ReactionMs,
        s2HoldMs: nextMetrics.s2HoldMs,
        s3Hits: nextMetrics.s3Hits,
        s3Total: nextMetrics.s3Total,
        s4TimeMs: nextMetrics.s4TimeMs,
        s4Deviations: nextMetrics.s4Deviations,
        s5Round1Ms: nextMetrics.s5Round1Ms,
        s5Round2Ms: nextMetrics.s5Round2Ms,
      };
      const { pathId, pathLevel, lipMode, lipTier, independentUse, rationale } = assignPathProfile(
        screenerMetrics,
        { skipped: true }
      );
      pendingProfileSaveRef.current = {
        pathId,
        pathLevel,
        lipMode,
        lipTier,
        independentUse,
        currentLevel: firstStageForMode(pathId),
        currentStage: firstStageForMode(pathId),
        screenerMetrics,
      };
      setAssignment({
        pathId,
        pathLevel,
        lipMode,
        lipTier,
        independentUse,
        rationale,
        metrics: screenerMetrics,
      });
      setMetrics(nextMetrics);
      setFinished(true);
    }
  }, [step, s5Phase, s5Round1Start, s5Round2Start, metrics]);

  const saveProfileAndNavigate = useCallback(async (path) => {
    const payload = pendingProfileSaveRef.current;
    if (payload) {
      setProfile((p) => ({
        ...p,
        pathId: payload.pathId,
        pathLevel: payload.pathLevel,
        lipMode: payload.lipMode,
        lipTier: payload.lipTier,
        independentUse: payload.independentUse,
        currentLevel: payload.currentLevel,
        currentStage: payload.currentStage,
        screenerMetrics: payload.screenerMetrics,
      }));
      pendingProfileSaveRef.current = null;
    }
    navigate(path, { replace: true });
  }, [navigate, setProfile]);

  const retryScreener = useCallback(() => {
    setStep(1);
    setFailedLevel(false);
    setS2FailedAttempts(0);
    setFeedbackMessage("");
    setMetrics({
      s1ReactionMs: null,
      s2HoldMs: null,
      s3Hits: 0,
      s3Total: 5,
      s4TimeMs: null,
      s4Deviations: 0,
      s5Round1Ms: null,
      s5Round2Ms: null,
    });
    setS3Selected(new Set());
    setS4Done(false);
    setS5Phase(1);
    setS5Round1Selected(new Set());
    setS5Round2Selected(new Set());
    setS5Round1Start(null);
    setS5Round2Start(null);
    setS5Round2Transition(false);
    screenerCompletedRef.current = false;
    pendingProfileSaveRef.current = null;
    s2HadProgressRef.current = false;
    s4OutOfBoundsFeedbackCooldownRef.current = 0;
    setInstructionAcknowledged(false);
    setDialogFading(false);
    prevStepRef.current = 1;
  }, []);

  if (failedLevel) {
    return (
      <SetupFailureCard
        title="Screening needs more support"
        subtitle="The screener stopped"
        summary="The learner did not meet the required control checks in this run."
        guidance={[
          `Stabilization step: leaving target repeatedly can fail after ${FAILED_STABILIZATION_ATTEMPTS} retries.`,
          `Corridor step: leaving the strip can fail after ${S4_MAX_DEVIATIONS_BEFORE_FAIL} deviations.`,
          "Try in a calm environment with clear camera framing and short breaks.",
        ]}
        primaryLabel="Try screener again"
        secondaryLabel="Back to Home"
        onPrimary={retryScreener}
        onSecondary={() => navigate("/home", { replace: true })}
      />
    );
  }

  if (finished && assignment) {
    const pathId = assignment.pathId ?? assignment.lipMode;
    const pathLevelNum =
      assignment.pathLevel ??
      (assignment.lipMode === 1
        ? assignment.lipTier === 1
          ? 1
          : 2
        : assignment.lipTier === 3
        ? 1
        : 2);
    const ModeIcon = pathId === 1 ? Target : Route;
    const modeName = pathId === 1 ? "Mode 1 — Intent Capture" : "Mode 2 — Guided Control";
    const pathLevel = getPathLevelCopy(pathId, pathLevelNum);
    const modeBlurb =
      pathId === 1
        ? "Tilt direction will trigger predefined actions. Maximum assistance and autocomplete are on."
        : "You'll drive the cursor with scaffolding. Corridor guidance and smoothing are on.";
    const fmt = (ms) => (ms == null ? "—" : `${Math.round(ms)} ms`);
    const metricRows = [
      {
        label: "S1 · Reaction to first target",
        value: fmt(assignment.metrics.s1ReactionMs),
        note: "Time from prompt to pressing Start.",
      },
      {
        label: "S2 · Hold-in-target stability",
        value: fmt(assignment.metrics.s2HoldMs),
        note: "Continuous time kept inside the circle (target 5 000 ms).",
      },
      {
        label: "S3 · Activation reliability",
        value: `${assignment.metrics.s3Hits ?? 0} / ${assignment.metrics.s3Total ?? 5} (${assignment.rationale.activationAccuracy}%)`,
        note: "Targets selected by mouth-open / click.",
      },
      {
        label: "S4 · Corridor trace",
        value: `${fmt(assignment.metrics.s4TimeMs)} · ${assignment.metrics.s4Deviations ?? 0} deviations`,
        note: "Time to cross the strip and how often cursor left it.",
      },
      {
        label: "S5 · Fatigue ratio (R2 / R1)",
        value: `${assignment.rationale.fatigueRatio}×`,
        note: "Late-session slowdown. >1.4 suggests fatigue sensitivity.",
      },
    ];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center easeL-page-bg pt-28 pb-10 px-6">
        <div className="max-w-2xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-8 md:p-10 shadow-2xl border-2 border-emerald-100 animate-fade-scale-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Check className="w-9 h-9" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Screening complete</h1>
              <p className="text-slate-600">Your Learning–Interaction Profile has been assigned.</p>
            </div>
          </div>

          <div
            className="mb-6 flex items-center gap-4 rounded-2xl border-2 p-5 easeL-accent-bg"
            style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 28%, transparent)" }}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm easeL-accent-text-strong">
              <ModeIcon className="w-8 h-8" strokeWidth={2.2} />
            </div>
            <div>
              <p className="easeL-accent-text-strong text-sm font-semibold uppercase tracking-wide">
                Assigned learning profile
              </p>
              <p className="text-xl font-bold text-slate-800">{pathLevel.fullLabel}</p>
              <p className="easeL-accent-text-strong mt-1 text-sm font-semibold">{modeName}</p>
              <p className="text-slate-600 text-sm mt-1">{modeBlurb}</p>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
              How we measured this
            </p>
            <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
              {metricRows.map((row) => (
                <div key={row.label} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{row.label}</p>
                    <p className="text-sm text-slate-500">{row.note}</p>
                  </div>
                  <p className="font-mono text-slate-800 text-right whitespace-nowrap">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">Rationale:</span> {assignment.rationale.reason}{" "}
              Activation {assignment.rationale.activationAccuracy}% · fatigue ratio{" "}
              {assignment.rationale.fatigueRatio}× →{" "}
              <span className="font-semibold text-slate-700">
                {pathLevel.pathName}, {pathLevel.levelLabel}
              </span>
              . Use category:{" "}
              <span className="font-semibold text-slate-700">
                {assignment.independentUse ? "Independent-use" : "Assisted-use"}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button
              onClick={() => saveProfileAndNavigate("/home")}
              className="min-h-14 px-8 easeL-btn-solid rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[color:var(--easeL-focus-ring)]"
            >
              Continue to Home
            </button>
            <button
              onClick={() => saveProfileAndNavigate("/lessons")}
              className="min-h-14 rounded-2xl border-4 border-[color:var(--easeL-primary)] px-8 text-lg font-bold text-[color:var(--easeL-primary)] transition-all hover:scale-[1.02] hover:border-[color:var(--easeL-primary-mid)] hover:bg-[color-mix(in_srgb,var(--easeL-primary)_10%,white)] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[color:var(--easeL-focus-ring)]"
            >
              Start Lessons
            </button>
          </div>
        </div>
      </div>
    );
  }

  const listenAgainBtn = (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      <button
        type="button"
        ref={(el) => { buttonRefs.current["listen-again"] = el; }}
        onClick={playInstructionAgain}
        className={`inline-flex items-center gap-2 rounded-2xl border-2 px-6 py-3 text-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)] ${
          cursorHoverId === "listen-again"
            ? "border-[color:color-mix(in_srgb,var(--easeL-primary)_35%,transparent)] bg-white/70 text-[color:var(--easeL-primary)]"
            : "border-transparent text-slate-700"
        }`}
      >
        <Volume2 className="w-7 h-7" aria-hidden /> Listen again
      </button>
      <button
        type="button"
        ref={(el) => { buttonRefs.current["help-btn"] = el; }}
        onClick={openHelpDialog}
        className={`inline-flex items-center gap-2 rounded-2xl border-2 px-6 py-3 text-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)] ${
          cursorHoverId === "help-btn"
            ? "border-[color:color-mix(in_srgb,var(--easeL-primary)_35%,transparent)] bg-white/70 text-[color:var(--easeL-primary)]"
            : "border-transparent text-slate-700"
        }`}
        aria-label="Help: show instruction again"
      >
        <HelpCircle className="w-7 h-7" aria-hidden /> Help
      </button>
    </div>
  );

  const taskCompleteOverlay = showTaskComplete && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" aria-live="polite">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-200 max-w-md w-full mx-4 py-12 px-8 flex flex-col items-center gap-6 animate-fade-scale-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white">
          <Check className="w-12 h-12" strokeWidth={3} />
        </div>
        <p className="text-2xl md:text-3xl font-bold text-emerald-800">Great job!</p>
      </div>
    </div>
  );

  const helpDialogOverlay = showHelpDialog && (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm pt-24 pb-8 px-6" aria-modal="true" role="dialog" aria-labelledby="help-dialog-title">
      <div className="easeL-auth-card relative flex w-full max-w-2xl flex-col items-center gap-8 p-10 md:p-12">
        <button
          type="button"
          onClick={() => { setShowHelpDialog(false); stopSpeech(); }}
          className="absolute right-6 top-6 rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)]"
          aria-label="Close help"
        >
          <X className="w-8 h-8" />
        </button>
        <p id="help-dialog-title" className="easeL-accent-text-strong text-2xl font-bold">
          Step {step} of 5
        </p>
        <p className="text-3xl md:text-4xl font-bold text-slate-800 leading-snug text-center">
          {STEP_INSTRUCTIONS[step]}
        </p>
        <PathScreenerStepAnimation step={step} />
      </div>
    </div>
  );

  const instructionOverlay = !instructionAcknowledged && !showTaskComplete && (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm pt-24 pb-8 px-6 transition-opacity duration-500 ${
        dialogFading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={instructionAcknowledged}
    >
      <div
        className={`easeL-auth-card flex w-full max-w-2xl flex-col items-center gap-8 p-10 transition-opacity duration-500 md:p-12 ${
          dialogFading ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="easeL-accent-text-strong text-2xl font-bold">Step {step} of 5</p>
        <p className="text-3xl md:text-4xl font-bold text-slate-800 leading-snug text-center">
          {STEP_INSTRUCTIONS[step]}
        </p>
        <PathScreenerStepAnimation step={step} />
      </div>
    </div>
  );

  const content = () => {
    if (step === 1) {
      return (
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          <button
            type="button"
            ref={(el) => { buttonRefs.current["s1-btn"] = el; }}
            onClick={() => handleActivate("s1-btn")}
            className={`min-h-[4.5rem] min-w-[14rem] px-12 rounded-2xl text-white font-bold text-2xl shadow-xl active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300 ${
              cursorHoverId === "s1-btn" ? "bg-emerald-600 scale-[1.03]" : "bg-emerald-500"
            }`}
          >
            Start
          </button>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          <div className="relative flex items-center justify-center" style={{ width: zoneR * 2, height: zoneR * 2 }}>
            <div
              className="easeL-accent-bg absolute inset-0 rounded-full border-4 shadow-inner"
              style={{
                borderColor: "color-mix(in srgb, var(--easeL-primary) 45%, transparent)",
                width: zoneR * 2,
                height: zoneR * 2,
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 rounded-full bg-emerald-400 transition-all duration-100 ease-out -translate-x-1/2 -translate-y-1/2"
              style={{
                width: zoneR * 2 * s2Progress,
                height: zoneR * 2 * s2Progress,
                maxWidth: zoneR * 2,
                maxHeight: zoneR * 2,
              }}
            />
          </div>
        </div>
      );
    }
    if (step === 3) {
      const targets = [1, 2, 3, 4, 5];
      return (
        <div className="text-center w-full max-w-4xl mx-auto flex flex-col items-center gap-10">
          <p className="text-2xl md:text-3xl font-bold text-slate-600">{s3Selected.size} of 5 selected</p>
          <div className="flex justify-center gap-12 flex-wrap">
            {targets.map((i) => {
              const selected = s3Selected.has(i);
              const id = `s3-${i}`;
              const cursorOver = cursorHoverId === id;
              return (
                <button
                  key={i}
                  ref={(el) => { buttonRefs.current[id] = el; }}
                  className={`flex h-24 w-24 items-center justify-center rounded-full border-4 text-2xl font-bold shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-[color:var(--easeL-focus-ring)] focus:ring-offset-2 md:h-28 md:w-28 ${
                    selected ? "scale-105 border-emerald-700 bg-emerald-500 text-white" : cursorOver ? "scale-105 bg-[color:color-mix(in_srgb,var(--easeL-primary)_42%,white)] shadow-xl" : "border-[color:var(--easeL-primary)] bg-[color-mix(in_srgb,var(--easeL-primary)_22%,white)] text-[color:var(--easeL-primary)]"
                  }`}
                >
                  {selected ? <Check className="w-12 h-12 md:w-14 md:h-14" /> : i}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (step === 4) {
      return (
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center">
          <div
            className="easeL-accent-bg absolute left-0 right-0 rounded-lg border-4 shadow-lg"
            style={{
              borderColor: "color-mix(in srgb, var(--easeL-primary) 45%, transparent)",
              top: corridorY - corridorH / 2,
              height: corridorH,
              left: corridorLeft,
              width: corridorRight - corridorLeft,
            }}
          />
        </div>
      );
    }
    if (step === 5) {
      const targets = [1, 2, 3];
      const s5Selected = s5Phase === 1 ? s5Round1Selected : s5Round2Selected;
      if (s5Round2Transition) {
        return (
          <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
            <p className="animate-pulse text-4xl font-bold text-[color:var(--easeL-accent-rose)] md:text-5xl">Round 2</p>
            <p className="text-2xl text-slate-600">Select the 3 circles again.</p>
          </div>
        );
      }
      return (
        <div className="text-center w-full max-w-4xl mx-auto flex flex-col items-center gap-10">
          <p className="text-2xl md:text-3xl font-bold text-slate-600">Round {s5Phase}: {s5Selected.size} of 3 selected</p>
          <div className="flex justify-center gap-16">
            {targets.map((i) => {
              const selected = s5Selected.has(i);
              const id = `s5-${i}`;
              const cursorOver = cursorHoverId === id;
              return (
                <button
                  key={i}
                  ref={(el) => { buttonRefs.current[id] = el; }}
                  className={`flex h-24 w-24 items-center justify-center rounded-full border-4 text-2xl font-bold shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-[color:var(--easeL-focus-ring)] focus:ring-offset-2 md:h-28 md:w-28 ${
                    selected ? "scale-105 border-emerald-700 bg-emerald-500 text-white" : cursorOver ? "scale-105 bg-[color:color-mix(in_srgb,var(--easeL-accent-rose)_38%,white)] shadow-xl" : "border-[color:var(--easeL-accent-rose)] bg-[color-mix(in_srgb,var(--easeL-accent-rose)_20%,white)] text-[color:#4a1f42]"
                  }`}
                >
                  {selected ? <Check className="w-12 h-12 md:w-14 md:h-14" /> : i}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen easeL-page-bg pt-24 pb-20 flex flex-col overflow-hidden relative">
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <header
        className="shrink-0 border-b bg-white/40 px-6 pb-8 pt-8 text-center"
        style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 15%, transparent)" }}
      >
        <p className="easeL-accent-text-strong mb-4 text-2xl font-bold">Step {step} of 5</p>
        <p className="text-3xl md:text-4xl lg:text-[2.25rem] font-bold text-slate-800 leading-snug max-w-4xl mx-auto">
          {STEP_INSTRUCTIONS[step]}
        </p>
      </header>
      {feedbackMessage && (
        <div className="shrink-0 mx-4 mt-2 px-4 py-3 rounded-xl bg-amber-100 border-2 border-amber-300 text-amber-900 font-semibold text-center animate-fade-scale-in" role="alert">
          {feedbackMessage}
        </div>
      )}
      <main className="flex-1 flex flex-col items-center justify-center min-h-0 pt-10 pb-12 px-6">
        <div className="w-full flex flex-col items-center justify-center">
          {content()}
        </div>
      </main>
      <footer
        className="flex shrink-0 flex-col items-center gap-3 bg-white/30 px-6 py-6"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--easeL-primary) 15%, transparent)" }}
      >
        {listenAgainBtn}
        <button
          type="button"
          onClick={skipTask}
          className="rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)]"
          title="Skip task"
        >
          Skip
        </button>
      </footer>
      <Cursor ref={cursorRef} size={24} isPenDown={false} tool="brush" />
      {helpDialogOverlay}
      {taskCompleteOverlay}
      {instructionOverlay}
    </div>
  );
}
