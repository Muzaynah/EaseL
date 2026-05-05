import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Target as TargetIcon, Play, CircleCheck, CircleX } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCursorPositionBridgeRef } from "../../context/CursorPositionBridgeContext";
import { useFaceMesh } from "../../hooks/useFaceMesh";
import { useGestureControl } from "../../hooks/useGestureControl";
import { useCalibratedCursor } from "../../hooks/useCalibratedCursor";
import { useReinforcement } from "../../hooks/useReinforcement";
import { useSessionTimer } from "../../hooks/useSessionTimer";
import ReinforcementBurst from "../../components/ReinforcementBurst";
import BreakPrompt from "../../components/BreakPrompt";
import GhostStrokePreview from "../../components/GhostStrokePreview";
import MasteryToast from "../../components/MasteryToast";
import { getStage, pathLessonDisplayLevel } from "../../utils/lessonContent";
import { appendTrialLog, appendSessionLog, getTrialLog } from "../../utils/persistence";
import { getEffectiveActivationMethod } from "../../utils/profileSchema";
import { resolveActivationConfig } from "../../utils/activationConfig";
import { announceInstruction, stopAnnouncement, announceElement } from "../../utils/audioAnnouncer";
import {
  filterTrials,
  getAdaptedStage,
  maybeAdvanceStage,
  evaluateMastery,
  getMasteryFeedback,
} from "../../utils/stageAdaptation";
import { UI_TOKENS } from "../../theme/uiTokens";
import { createCanvasToScreen } from "../../utils/lessonCanvasViewport";
import { LESSON_CANVAS_WIDTH, LESSON_CANVAS_HEIGHT } from "../../constants/lessonCanvas";
import { useLessonFatigueBreakInterval } from "../../hooks/useLessonFatigueBreakInterval";
import { useDelayedFaceMeshStart } from "../../hooks/useDelayedFaceMeshStart";
import { useLessonDemoCountdown } from "../../hooks/useLessonDemoCountdown";
import { useLessonRailDotLoop } from "../../hooks/useLessonRailDotLoop";
import LessonDemoCountdownOverlay from "../../components/lessons/LessonDemoCountdownOverlay";
import LessonToolbar from "../../components/lessons/LessonToolbar";
import LessonRailDot from "../../components/lessons/LessonRailDot";
import LessonShell from "../../components/lessons/LessonShell";
import LessonInstructionCard from "../../components/LessonInstructionCard";
import { useLessonCaregiverToolbarReveal } from "../../hooks/useLessonCaregiverToolbarReveal";
import { adherenceBarColorFromStrokeScale } from "./path2/traceUtils";

const CANVAS_WIDTH = LESSON_CANVAS_WIDTH;
const CANVAS_HEIGHT = LESSON_CANVAS_HEIGHT;
// Full-fill time for the Stage 0 "any movement = fill" animation.  Shorter =
// more immediate cause-and-effect feedback.  2.5 s feels instant to a child
// while still giving caregivers time to confirm the movement was deliberate.
const AUTOCOMPLETE_MS = 950;

const STAGE_ICONS = { 0: Eye, 1: TargetIcon, 2: Play };
const DIR_LESSONS = ["left", "right", "up", "down"];
const TRACE_LESSONS = ["line", "circle", "slanted"];

function buildSegmentCenterline(start, end, segments = 84) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pts.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    });
  }
  return pts;
}

function buildPath1LessonPath(stageDef, attemptIndex, width, height, options = {}) {
  if (stageDef.stage === 0) {
    // Accept direction from options (URL ?variant=left) or rotate by attempt
    const dir = options.variant || DIR_LESSONS[attemptIndex % DIR_LESSONS.length];
    const cx = width / 2;
    const cy = height / 2;
    const len = 220;
    const map = {
      left: [{ x: cx + len / 2, y: cy }, { x: cx - len / 2, y: cy }],
      right: [{ x: cx - len / 2, y: cy }, { x: cx + len / 2, y: cy }],
      up: [{ x: cx, y: cy + len / 2 }, { x: cx, y: cy - len / 2 }],
      down: [{ x: cx, y: cy - len / 2 }, { x: cx, y: cy + len / 2 }],
    };
    const centerline = map[dir];
    return {
      type: "straight",
      centerline,
      start: centerline[0],
      end: centerline[1],
      width: 80,
      lessonDirection: dir,
    };
  }

  if (stageDef.stage === 1) {
    const marginX = 180;
    const marginY = 140;
    const x = marginX + Math.random() * (width - marginX * 2);
    const y = marginY + Math.random() * (height - marginY * 2);
    const holdRadius = Math.max(100, (stageDef.holdRadius ?? 140) - 40);
    return {
      type: "hold",
      start: { x, y },
      end: { x, y },
      width: holdRadius * 2,
      centerline: [{ x, y }],
      holdRadius,
      holdMs: 3000,
    };
  }

  const variant = TRACE_LESSONS[attemptIndex % TRACE_LESSONS.length];
  if (variant === "line") {
    const start = { x: 270, y: height / 2 };
    const end = { x: width - 270, y: height / 2 };
    return {
      type: "straight",
      start,
      end,
      width: 96,
      centerline: buildSegmentCenterline(start, end),
      traceVariant: variant,
    };
  }
  if (variant === "slanted") {
    const start = { x: 280, y: height - 200 };
    const end = { x: width - 280, y: 200 };
    return {
      type: "straight",
      start,
      end,
      width: 96,
      centerline: buildSegmentCenterline(start, end),
      traceVariant: variant,
    };
  }
  const cx = width / 2;
  const cy = height / 2;
  const r = 170;
  const points = 90;
  const centerline = [];
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2 - Math.PI / 2;
    centerline.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r });
  }
  return {
    type: "closed",
    centerline,
    width: 96,
    start: centerline[0],
    end: centerline[centerline.length - 1],
    traceVariant: variant,
  };
}

function expectedDirectionVector(pathValue, fillHeadValue) {
  const center = pathValue?.centerline;
  if (!center || center.length < 2) return null;
  const idx = Math.max(0, Math.min(center.length - 2, Math.floor(fillHeadValue)));
  const from = center[idx];
  const to = center[idx + 1];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-6) return null;
  return { x: dx / mag, y: dy / mag };
}

function directionLabel(d) {
  if (d === "left") return "Left";
  if (d === "right") return "Right";
  if (d === "up") return "Up";
  if (d === "down") return "Down";
  return "Forward";
}

function classifyMovementDirection(dx, dy, minMagnitude = 1.2) {
  const mag = Math.hypot(dx, dy);
  if (mag < minMagnitude) return null;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "down" : "up";
}

function drawMidDirectionArrow(ctx, centerline) {
  if (!centerline || centerline.length < 2) return;
  const mid = Math.max(0, Math.floor((centerline.length - 1) / 2));
  const from = centerline[Math.max(0, mid - 1)];
  const to = centerline[Math.min(centerline.length - 1, mid + 1)];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mag = Math.hypot(dx, dy);
  if (mag < 0.001) return;
  const ux = dx / mag;
  const uy = dy / mag;
  const px = -uy;
  const py = ux;
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2;
  const headLen = 11;
  const headHalfW = 8;

  // Single centered arrow head, no extra line segment.
  const tipX = cx + ux * 1.5;
  const tipY = cy + uy * 1.5;
  const baseX = tipX - ux * headLen;
  const baseY = tipY - uy * headLen;
  ctx.beginPath();
  ctx.moveTo(baseX + px * headHalfW, baseY + py * headHalfW);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(baseX - px * headHalfW, baseY - py * headHalfW);
  ctx.strokeStyle = "rgba(71, 85, 105, 0.66)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

/**
 * Mode 1 (Intent Capture) — single-screen, autocomplete-on-intent.
 * Stages 0, 1, 2 per framework §6.4:
 *   0. Cause→Effect: any head movement fills the line (direct cause-effect teaching).
 *   1. Hold / Stability: cursor must stay inside the target circle for N ms.
 *   2. Stop/Go Activation Control: single mouth-open (or dwell) triggers autocomplete.
 *
 * Implements: rolling-neutral cursor, ghost-stroke demo, mandatory reinforcement
 * after every attempt, scheduled breaks, session cap, dwell fallback, per-trial
 * metric logging (Appendix C). Always-visible cursor, skip-demo, recenter.
 */
export default function LessonPath1() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, updateProfile } = useAuth();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const lessonCursorBridge = useCursorPositionBridgeRef();
  const railDotRef = useRef(null);
  const buttonRefs = useRef({});
  const userStartTsRef = useRef(null);
  const activationErrorsRef = useRef(0);
  const mouthEventsRef = useRef(0);
  const jitterSamplesRef = useRef([]);
  const lastFillTickRef = useRef(null);
  const fillHeadRef = useRef(0);
  const autoFillRafRef = useRef(null);
  const autoFillActiveRef = useRef(false);
  const stage0IntentTriggeredRef = useRef(false);
  const stage2CompletionTriggeredRef = useRef(false);
  const stage2DriveRef = useRef(0);
  const stage2SignedEmaRef = useRef(0);
  const lastAdaptiveCueTsRef = useRef(0);
  const adaptiveHideTimeoutRef = useRef(null);
  const audioCtxRef = useRef(null);
  const lastAdaptiveTextRef = useRef("");
  const holdStartRef = useRef(null);
  const lastCanvasPosRef = useRef(null);
  const canvasCursorRef = useRef(null);
  // Position we actually draw the visible head-cursor at.  We decouple this
  // from cursorPosRef so we can snap the cursor onto the lesson path during
  // trials (so where the user sees the dot is literally where the progress is
  // happening).
  const displayCursorRef = useRef({ x: 0, y: 0 });

  const stageFromUrl = Number(searchParams.get("stage"));
  const stageRaw = Number.isFinite(stageFromUrl) && stageFromUrl >= 0 ? stageFromUrl : (profile?.currentStage ?? 0);
  const stageId = Math.max(0, Math.min(2, stageRaw));
  const stage = useMemo(() => getStage(stageId), [stageId]);
  const language = profile?.caregiverReported?.language ?? "en";
  const lowStim = Boolean(profile?.lowStimulation);

  const {
    cursorPosRef,
    updateCursorFromLandmarks,
    tiltStateRef,
    freezeRecalibrationRef,
  } = useCalibratedCursor(profile);
  const activationConfig = resolveActivationConfig(profile, "lessons");
  const effectiveActivation = getEffectiveActivationMethod(profile);
  const reinforcement = useReinforcement({ audio: true });
  const breakIntervalMs = useLessonFatigueBreakInterval(user?.uid);
  const sessionTimer = useSessionTimer({
    capMinutes: profile?.sessionLengthPreference ?? 15,
    breakIntervalMs,
  });
  const { caregiverControlsVisible, revealCaregiverControls } = useLessonCaregiverToolbarReveal();

  const [phase, setPhase] = useState("demo"); // demo | trial | reinforce | complete
  const [attempt, setAttempt] = useState(0);
  const [fillHead, setFillHead] = useState(0);
  const [path, setPath] = useState(null);
  const [muted, setMuted] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [masteryToast, setMasteryToast] = useState(null);
  const [instructionDismiss, setInstructionDismiss] = useState(0);
  const [stageUnlock, setStageUnlock] = useState(null);
  const [stage0Mastery, setStage0Mastery] = useState(null);
  const [, setMasteryHint] = useState("");
  const [, setAttemptFeedback] = useState("");
  const [adaptiveFeedback, setAdaptiveFeedback] = useState(null);

  // Framework §7.4 — the stage definition we hand to path generation and hit
  // tests is the user's raw stage SOFTENED by their recent performance.
  // A struggling learner automatically gets a wider corridor / bigger hold
  // target; a mastering learner gets a subtly tighter one.  This is purely
  // derived from the trial log.
  const adaptedStage = useMemo(() => {
    const log = typeof window !== "undefined" ? getTrialLog() : [];
    const stageTrials = filterTrials(log, {
      userId: user?.uid ?? "local",
      mode: 1,
      stage: stage.stage,
    });
    return getAdaptedStage(stage, stageTrials);
    // re-run whenever we finish an attempt
  }, [stage, attempt, user?.uid]);

  const pathRef = useRef(null);
  pathRef.current = path;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const stageRef = useRef(adaptedStage);
  stageRef.current = adaptedStage;

  // Freeze rolling-neutral recalibration while an attempt is live so the
  // baseline can't drift toward the user's intentional tilt.  Framework §3.3
  // recalibration targets slow resting-pose drift, not deliberate movement
  // within a trial.  On Stage 1 (hold) this matters most: the user tilts
  // into the target and holds — if we recalibrated mid-hold, the cursor
  // would drift back to centre and break the trial.
  useEffect(() => {
    if (freezeRecalibrationRef) {
      freezeRecalibrationRef.current = phase === "trial";
    }
  }, [phase, freezeRecalibrationRef]);

  // Populate Stage 0 mastery status for the completion modal
  useEffect(() => {
    if (phase !== "complete" || stage.stage !== 0) return;
    const log = getTrialLog();
    const directions = ["left", "right", "up", "down"];
    const masterStatus = {};
    for (const dir of directions) {
      const lessonKey = `0:${dir}`;
      const dirTrials = filterTrials(log, {
        userId: user?.uid ?? "local",
        mode: 1,
        stage: 0,
      }).filter((t) => t.lessonKey === lessonKey);
      const result = evaluateMastery(stage, dirTrials);
      masterStatus[dir] = result.mastered;
    }
    setStage0Mastery(masterStatus);
  }, [phase, stage, user?.uid]);

  const resetTrial = useCallback(() => {
    activationErrorsRef.current = 0;
    mouthEventsRef.current = 0;
    jitterSamplesRef.current = [];
    fillHeadRef.current = 0;
    setFillHead(0);
    lastFillTickRef.current = null;
    holdStartRef.current = null;
    setHoldProgress(0);
    userStartTsRef.current = null;
    lastCanvasPosRef.current = null;
    stage0IntentTriggeredRef.current = false;
    stage2CompletionTriggeredRef.current = false;
    stage2DriveRef.current = 0;
    stage2SignedEmaRef.current = 0;
    autoFillActiveRef.current = false;
    if (autoFillRafRef.current != null) {
      cancelAnimationFrame(autoFillRafRef.current);
      autoFillRafRef.current = null;
    }
    if (adaptiveHideTimeoutRef.current) {
      clearTimeout(adaptiveHideTimeoutRef.current);
      adaptiveHideTimeoutRef.current = null;
    }
    setAdaptiveFeedback(null);
  }, []);

  const playErrorBeep = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(230, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch {
      // Ignore audio failures; visual cue still appears.
    }
  }, []);

  const advanceAttempt = useCallback((success, extraMetrics = {}) => {
    if (phaseRef.current === "reinforce") return;
    const st = stageRef.current;
    const duration = userStartTsRef.current != null ? Date.now() - userStartTsRef.current : 0;
    const jitter =
      jitterSamplesRef.current.length > 0
        ? jitterSamplesRef.current.reduce((a, b) => a + b, 0) / jitterSamplesRef.current.length
        : 0;
    // For Stage 0, track each direction separately in mastery
    const lessonKey = st.stage === 0 && pathRef.current?.lessonDirection
      ? `${st.stage}:${pathRef.current.lessonDirection}`
      : st.stage;

    appendTrialLog({
      userId: user?.uid ?? "local",
      mode: 1,
      stage: st.stage,
      lessonKey,
      attempt: attempt + 1,
      shape: st.shape,
      direction: st.stage === 0 ? pathRef.current?.lessonDirection : null,
      durationMs: duration,
      success,
      activationErrors: activationErrorsRef.current,
      mouthEvents: mouthEventsRef.current,
      jitter: Number(jitter.toFixed(5)),
      activationMethod: effectiveActivation,
      autocompleteLevel: st.autocompleteLevel ?? 100,
      assistance: {
        corridorWidth: st.corridorWidth ?? null,
        holdRadius: st.holdRadius ?? null,
        holdMs: st.holdMs ?? null,
      },
      ...extraMetrics,
    });
    reinforcement.trigger();
    setPhase("reinforce");

    // For mastery evaluation, use lessonKey to filter trials (includes direction for Stage 0)
    const staged = filterTrials(getTrialLog(), {
      userId: user?.uid ?? "local",
      mode: 1,
      stage: st.stage,
    }).filter((t) => {
      if (st.stage === 0) {
        return t.lessonKey === lessonKey;
      }
      return true;
    });
    const mastery = evaluateMastery(st, staged);
    setMasteryHint(getMasteryFeedback(st, mastery));
    if (!success) {
      setAttemptFeedback(
        language === "ur"
          ? "اچھی کوشش! پہلے کرسر کو آغاز کی جگہ کے قریب لائیں۔"
          : "Nice try. Start by bringing the cursor near the green start point.",
      );
    } else if (st.shape === "hold") {
      setAttemptFeedback(
        language === "ur"
          ? "شاباش! آپ نے ہولڈ مکمل کیا۔"
          : "Good job! You completed the hold.",
      );
    } else {
      setAttemptFeedback(
        language === "ur"
          ? "شاباش! حرکت بہترین تھی۔"
          : "Good job! Your movement was excellent.",
      );
    }
    let unlockedNext = null;
    // Framework §7.3 — after each attempt, silently check mastery and nudge
    // the user's current stage forward (capped at Stage 2 for Mode 1).  We
    // only do this if the user hasn't pinned a specific stage via ?stage=…
    // so caregivers / dev mode can still freely explore.
    // Only lock stage progression in explicit dev-override mode.
    const pinnedStage = searchParams.get("lockStage") === "1";
    if (!pinnedStage && updateProfile) {
      const next = maybeAdvanceStage({
        profile,
        trialLog: getTrialLog(),
        userId: user?.uid ?? "local",
      });
      if (next != null && next <= 2 && next > (profile?.currentStage ?? 0)) {
        const nextStageDef = getStage(next);
        updateProfile({ ...profile, currentStage: next, currentLevel: next });
        const unlockedTitle = nextStageDef?.title ?? `Stage ${next}`;
        setMasteryToast(unlockedTitle);
        unlockedNext = { stage: next, title: unlockedTitle };
      }
    }
    setTimeout(() => {
      if (unlockedNext) {
        setStageUnlock(unlockedNext);
        return;
      }
      // Check if Stage 0 is complete before looping
      if (st.stage === 0) {
        const log = getTrialLog();
        const directions = ["left", "right", "up", "down"];
        let allDirsComplete = true;
        for (const dir of directions) {
          const lessonKey = `0:${dir}`;
          const dirTrials = filterTrials(log, {
            userId: user?.uid ?? "local",
            mode: 1,
            stage: 0,
          }).filter((t) => t.lessonKey === lessonKey);
          const result = evaluateMastery(st, dirTrials);
          if (!result.mastered) {
            allDirsComplete = false;
            break;
          }
        }
        if (allDirsComplete) {
          setPhase("complete");
          return;
        }
      }
      setAttempt((a) => a + 1);
      resetTrial();
      setPhase("demo");
    }, 1400);
  }, [attempt, effectiveActivation, reinforcement, user?.uid, resetTrial, profile, updateProfile, searchParams, language]);

  useEffect(() => {
    if (stageUnlock || phase === "complete") return;
    const variant = searchParams.get("variant") || null;
    const p = buildPath1LessonPath(adaptedStage, attempt, CANVAS_WIDTH, CANVAS_HEIGHT, { variant });
    setPath(p);
    resetTrial();
  }, [adaptedStage, attempt, resetTrial, searchParams, stageUnlock, phase]);

  // Dismiss the instruction card as soon as the user shows intent — either
  // the line has started filling or they've moved into the hold target.
  // Keeps the card out of the way once the user has clearly understood.
  useEffect(() => {
    if (phase !== "trial") return;
    if (fillHead > 0.2 || holdProgress > 0.02) {
      setInstructionDismiss((n) => n + 1);
    }
  }, [fillHead, holdProgress, phase]);

  // Stage 0-2 are auto-start/auto-complete; activation gestures are ignored.
  const handleActivation = useCallback(
    (down) => {
      if (phaseRef.current !== "trial") return;
      if (!down) return;
      const st = stageRef.current;
      if (st.stage <= 2) return;
      if (st.shape === "hold") {
        activationErrorsRef.current += 1;
        return;
      }
      activationErrorsRef.current += 1;
    },
    [],
  );

  const handleToolbarHover = useCallback((target) => {
    if (target) {
      announceElement(target, language);
    }
  }, [language]);

  const { processLandmarks } = useGestureControl({
    cursorPosRef,
    activationMethod: effectiveActivation,
    onPenToggle: handleActivation,
    onMouthEvent: () => {
      mouthEventsRef.current += 1;
    },
    onButtonHover: handleToolbarHover,
    buttonRefs,
    mouthOpenThreshold: activationConfig.mouthOpenThreshold,
    framesToConfirm: activationConfig.framesToConfirm,
    cooldownMs: activationConfig.cooldownMs,
    dwellMs: activationConfig.dwellMs,
    dwellRadius: activationConfig.dwellRadius,
  });

  // Recenter cursor to window center; useful when user's cursor drifts.
  const recenter = useCallback(() => {
    if (typeof window === "undefined") return;
    cursorPosRef.current.x = window.innerWidth / 2;
    cursorPosRef.current.y = window.innerHeight / 2;
  }, [cursorPosRef]);

  // Helper: map canvas-internal (CANVAS_WIDTH x CANVAS_HEIGHT) coords to the
  // on-screen pixel position of the same point.  Used to snap the visible
  // cursor onto the lesson path during trials.
  const canvasToScreen = useMemo(
    () => createCanvasToScreen(canvasRef, CANVAS_WIDTH, CANVAS_HEIGHT),
    [],
  );

  /** Snap both the tracking cursor and the display cursor to a canvas
   * point.  Used at trial start so the user isn't hunting for the green
   * dot / hold target — the cursor is already there. */
  const snapCursorToCanvasPoint = useCallback(
    (cx, cy) => {
      const screen = canvasToScreen(cx, cy);
      if (cursorPosRef?.current) {
        cursorPosRef.current.x = screen.x;
        cursorPosRef.current.y = screen.y;
      }
      displayCursorRef.current.x = screen.x;
      displayCursorRef.current.y = screen.y;
    },
    [canvasToScreen, cursorPosRef],
  );

  const onFaceResults = useCallback((results) => {
    const landmarks = results?.multiFaceLandmarks?.[0];
    if (!landmarks) return;
    updateCursorFromLandmarks(landmarks);
    processLandmarks(landmarks, false);

    if (tiltStateRef.current?.lastJitter != null) {
      jitterSamplesRef.current.push(tiltStateRef.current.lastJitter);
      if (jitterSamplesRef.current.length > 200) jitterSamplesRef.current.shift();
    }

    const st = stageRef.current;

    // Default: the displayed cursor follows the raw head-tracked position.
    // Stage-specific branches below may override this to keep the visible
    // cursor on the lesson path so motion and feedback stay in sync.
    displayCursorRef.current.x = cursorPosRef.current.x;
    displayCursorRef.current.y = cursorPosRef.current.y;

    if (phaseRef.current === "trial" && canvasRef.current && pathRef.current) {
      if (userStartTsRef.current == null) userStartTsRef.current = Date.now();

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const rawCanvasX = ((cursorPosRef.current.x - rect.left) / rect.width) * canvas.width;
      const rawCanvasY = ((cursorPosRef.current.y - rect.top) / rect.height) * canvas.height;
      const canvasX = Math.max(0, Math.min(canvas.width, rawCanvasX));
      const canvasY = Math.max(0, Math.min(canvas.height, rawCanvasY));
      canvasCursorRef.current = { x: canvasX, y: canvasY };

      if (st.stage === 0 && pathRef.current.centerline) {
        const dir = pathRef.current.lessonDirection;
        const delta = lastCanvasPosRef.current
          ? { x: canvasX - lastCanvasPosRef.current.x, y: canvasY - lastCanvasPosRef.current.y }
          : { x: 0, y: 0 };
        const movedDir = classifyMovementDirection(delta.x, delta.y, 1.2);
        const axisDelta = dir === "left" ? -delta.x : dir === "right" ? delta.x : dir === "up" ? -delta.y : delta.y;
        if (movedDir && movedDir !== dir) {
          const now = Date.now();
          if (adaptiveHideTimeoutRef.current) {
            clearTimeout(adaptiveHideTimeoutRef.current);
            adaptiveHideTimeoutRef.current = null;
          }
          const text =
            language === "ur"
              ? `آپ نے ${directionLabel(movedDir)} کی طرف حرکت کی۔ ${directionLabel(dir)} کی طرف حرکت کریں۔`
              : `You moved ${directionLabel(movedDir)}. Move ${directionLabel(dir)}.`;
          const shouldUpdateText = text !== lastAdaptiveTextRef.current;
          if (shouldUpdateText || now - lastAdaptiveCueTsRef.current > 900) {
            lastAdaptiveCueTsRef.current = now;
            lastAdaptiveTextRef.current = text;
            setAdaptiveFeedback({ text });
            playErrorBeep();
          }
        } else {
          if (!adaptiveHideTimeoutRef.current && adaptiveFeedback) {
            adaptiveHideTimeoutRef.current = setTimeout(() => {
              setAdaptiveFeedback(null);
              lastAdaptiveTextRef.current = "";
              adaptiveHideTimeoutRef.current = null;
            }, 1000);
          }
        }
        if (axisDelta > 1.2 && !stage0IntentTriggeredRef.current && !autoFillActiveRef.current) {
          stage0IntentTriggeredRef.current = true;
          fillHeadRef.current = 0;
          setFillHead(0);
          autocompleteFrom(0);
        }
      }

      // Stage 1 — Hold inside target circle.  Cursor stays under raw head
      // control; users must aim into the circle themselves.  We also gently
      // "assist" by pulling the cursor toward the centre when they're already
      // close, which matches the framework's errorless-learning intent.
      if (st.shape === "hold") {
        const dx = canvasX - pathRef.current.start.x;
        const dy = canvasY - pathRef.current.start.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= pathRef.current.holdRadius) {
          if (holdStartRef.current == null) holdStartRef.current = performance.now();
          const held = performance.now() - holdStartRef.current;
          const holdMs = pathRef.current.holdMs ?? 1500;
          setHoldProgress(Math.min(1, held / holdMs));
          if (held >= holdMs) {
            advanceAttempt(true, { held: Math.round(held) });
          }
        } else {
          holdStartRef.current = null;
          setHoldProgress(0);
        }
      }

      if (st.stage === 2 && pathRef.current.centerline) {
        const center = pathRef.current.centerline;
        const requiredIndex = (center.length - 1) * 0.78;
        const isCircleTrace = pathRef.current.traceVariant === "circle";
        const delta = lastCanvasPosRef.current
          ? { x: canvasX - lastCanvasPosRef.current.x, y: canvasY - lastCanvasPosRef.current.y }
          : { x: 0, y: 0 };
        const expected = expectedDirectionVector(pathRef.current, fillHeadRef.current);
        const signed = expected ? delta.x * expected.x + delta.y * expected.y : 0;
        stage2SignedEmaRef.current = stage2SignedEmaRef.current * 0.82 + signed * 0.18;
        const forwardSignal = Math.max(signed, stage2SignedEmaRef.current);
        if (!stage2CompletionTriggeredRef.current) {
          // Sustained-direction ramp: fill starts slow, then builds as the user
          // keeps moving correctly (instead of jumping immediately).
          const driveGainBase = isCircleTrace ? 0.023 : 0.012;
          const driveGainSigned = isCircleTrace ? 0.011 : 0.006;
          const driveGainSignedCap = isCircleTrace ? 0.032 : 0.018;
          const driveDecay = isCircleTrace ? 0.04 : 0.026;
          const fillBase = isCircleTrace ? 0.075 : 0.042;
          const fillScale = isCircleTrace ? 0.36 : 0.19;
          if (forwardSignal > 0.02) {
            stage2DriveRef.current = Math.min(
              1,
              stage2DriveRef.current +
                driveGainBase +
                Math.min(driveGainSignedCap, forwardSignal * driveGainSigned)
            );
          } else {
            stage2DriveRef.current = Math.max(0, stage2DriveRef.current - driveDecay);
          }

          if ((forwardSignal > 0 || stage2DriveRef.current > 0.12) && stage2DriveRef.current > 0) {
            const add =
              fillBase + stage2DriveRef.current * fillScale + Math.max(0, forwardSignal) * 0.04;
            fillHeadRef.current = Math.min(requiredIndex, fillHeadRef.current + add);
            setFillHead(fillHeadRef.current);
          } else if (forwardSignal < -0.08) {
            // Wrong direction gently decays progress to reinforce correction.
            fillHeadRef.current = Math.max(0, fillHeadRef.current - 0.28);
            setFillHead(fillHeadRef.current);
          }
          if (fillHeadRef.current >= requiredIndex - 0.001 && !autoFillActiveRef.current) {
            stage2CompletionTriggeredRef.current = true;
            autocompleteFrom(requiredIndex, 1050);
          }
        }
      }

      if (pathRef.current?.centerline?.length && st.shape !== "hold") {
        if (st.stage === 0) {
          const center = pathRef.current.centerline;
          const i = Math.min(center.length - 1, Math.floor(fillHeadRef.current));
          const frac = Math.max(0, fillHeadRef.current - i);
          const a = center[i];
          const b = center[Math.min(center.length - 1, i + 1)];
          const tipX = a.x + frac * (b.x - a.x);
          const tipY = a.y + frac * (b.y - a.y);
          const screen = canvasToScreen(tipX, tipY);
          displayCursorRef.current.x = screen.x;
          displayCursorRef.current.y = screen.y;
        }
      }
      lastCanvasPosRef.current = { x: canvasX, y: canvasY };
    }

    drawScene();
  }, [
    updateCursorFromLandmarks,
    processLandmarks,
    cursorPosRef,
    tiltStateRef,
    advanceAttempt,
    canvasToScreen,
    activationConfig,
    language,
    playErrorBeep,
    adaptiveFeedback,
  ]);

  const { startFaceMesh } = useFaceMesh({ videoRef, onResults: onFaceResults });
  useDelayedFaceMeshStart(startFaceMesh);

  useEffect(() => {
    if (muted) {
      stopAnnouncement();
      return;
    }
    if (phase === "demo") {
      const watchText = language === "ur" ? "پہلے میری طرف دیکھیں۔" : "Watch me first.";
      announceInstruction(watchText, language);

      setTimeout(() => {
        if (stage.shape === "hold") {
          const holdText = language === "ur"
            ? "دائرے پر سر کو ساکن رکھیں۔"
            : "Hold your head as still as you can.";
          announceInstruction(holdText, language);
        } else if (stage.stage === 0) {
          const dir = pathRef.current?.lessonDirection;
          const dirTexts = {
            left: language === "ur" ? "بائیں طرف حرکت دیں۔" : "Move left.",
            right: language === "ur" ? "دائیں طرف حرکت دیں۔" : "Move right.",
            up: language === "ur" ? "اوپر حرکت دیں۔" : "Move up.",
            down: language === "ur" ? "نیچے حرکت دیں۔" : "Move down."
          };
          const text = dirTexts[dir] || "Move your head.";
          announceInstruction(text, language);
        } else {
          const tiltText = language === "ur"
            ? "اپنا سر شکل کی طرف جھکائیں۔"
            : "Tilt your head toward the shape.";
          announceInstruction(tiltText, language);
        }
      }, 1400);
    }
    return () => stopAnnouncement();
  }, [phase, stage, language, muted]);

  function autocompleteFrom(fromIndex, durationMs = AUTOCOMPLETE_MS) {
    const center = pathRef.current?.centerline;
    if (!center?.length || phaseRef.current !== "trial") return;
    if (autoFillActiveRef.current) return;
    autoFillActiveRef.current = true;
    if (autoFillRafRef.current != null) {
      cancelAnimationFrame(autoFillRafRef.current);
      autoFillRafRef.current = null;
    }
    const toIndex = center.length - 1;
    const start = performance.now();
    const step = (now) => {
      if (phaseRef.current !== "trial") {
        autoFillActiveRef.current = false;
        autoFillRafRef.current = null;
        return;
      }
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const head = fromIndex + eased * (toIndex - fromIndex);
      fillHeadRef.current = head;
      setFillHead(head);
      drawScene();
      if (t < 1) {
        autoFillRafRef.current = requestAnimationFrame(step);
      } else {
        autoFillActiveRef.current = false;
        autoFillRafRef.current = null;
        advanceAttempt(true, { intentAligned: true, autocompleted: true });
      }
    };
    autoFillRafRef.current = requestAnimationFrame(step);
  }

  function drawScene() {
    const canvas = canvasRef.current;
    if (!canvas || !pathRef.current?.centerline?.length) return;
    if (phaseRef.current === "demo" && stageRef.current.shape !== "hold") {
      // Ghost preview owns the canvas during demo phase.
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = UI_TOKENS.lesson.canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const p = pathRef.current;
    const center = p.centerline;
    const st = stageRef.current;
    // Always read progress from the ref: `drawScene()` runs in the same tick as
    // `setFillHead()` from face results, so React state would still be stale and
    // the teal stroke would never appear.
    const head = fillHeadRef.current ?? 0;

    if (st.shape === "hold") {
      // Big friendly target. Outer dashed ring + inner pulse + sweep arc.
      ctx.beginPath();
      ctx.arc(p.start.x, p.start.y, p.holdRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 102, 241, 0.14)";
      ctx.fill();
      ctx.strokeStyle = UI_TOKENS.lesson.tracePrimary;
      ctx.lineWidth = 5;
      ctx.setLineDash([14, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (phaseRef.current === "trial" && holdStartRef.current != null) {
        const held = Math.min((performance.now() - holdStartRef.current) / (p.holdMs ?? 2000), 1);
        ctx.beginPath();
        ctx.arc(
          p.start.x,
          p.start.y,
          p.holdRadius - 2,
          -Math.PI / 2,
          -Math.PI / 2 + held * Math.PI * 2,
        );
        ctx.strokeStyle = UI_TOKENS.lesson.startSoft;
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      // Always show the actual checked cursor position in hold lessons so
      // visual feedback exactly matches the pass/fail logic.
      const c = canvasCursorRef.current;
      if (c) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34, 197, 94, 0.92)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.stroke();
      }
      return;
    }

    ctx.strokeStyle = "rgba(100, 116, 139, 0.24)";
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(center[0].x, center[0].y);
    for (let i = 1; i < center.length; i++) ctx.lineTo(center[i].x, center[i].y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(71, 85, 105, 0.55)";
    ctx.lineWidth = 6;
    ctx.setLineDash([7, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    drawMidDirectionArrow(ctx, center);

    let tipX = center[0].x;
    let tipY = center[0].y;
    if (head > 0) {
      ctx.strokeStyle = UI_TOKENS.lesson.tracePrimary;
      ctx.lineWidth = 16;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(center[0].x, center[0].y);
      const lastI = Math.floor(head);
      for (let i = 1; i <= lastI && i < center.length; i++) ctx.lineTo(center[i].x, center[i].y);
      if (head > lastI && lastI + 1 < center.length) {
        const frac = head - lastI;
        const a = center[lastI];
        const b = center[lastI + 1];
        tipX = a.x + frac * (b.x - a.x);
        tipY = a.y + frac * (b.y - a.y);
        ctx.lineTo(tipX, tipY);
      } else if (lastI < center.length) {
        tipX = center[lastI].x;
        tipY = center[lastI].y;
      }
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(p.start.x, p.start.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = UI_TOKENS.lesson.success;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.end.x, p.end.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = UI_TOKENS.lesson.warning;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.stroke();

    // Pen-tip glow at the leading edge of the fill.  This doubles up with the
    // on-screen cursor (which is also snapped here) so it reads as ONE marker
    // even on low-contrast displays.
    if (phaseRef.current === "trial" && head > 0) {
      ctx.beginPath();
      ctx.arc(tipX, tipY, 22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99,102,241,0.18)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tipX, tipY, 10, 0, Math.PI * 2);
      ctx.fillStyle = UI_TOKENS.lesson.tracePrimaryDark;
      ctx.fill();
    }
  }

  const beginTrial = useCallback(() => {
    if (phaseRef.current !== "demo") return;
    resetTrial();
    // Snap the cursor to the natural "first touch" point for this stage so
    // the user isn't aiming from wherever the demo left them.  Stage 0 /
    // Stage 2 start at the left of the corridor; Stage 1 starts at the
    // hold target's centre.
    const p = pathRef.current;
    const st = stageRef.current;
    if (p) {
      if (st.shape !== "hold" && p.start) {
        snapCursorToCanvasPoint(p.start.x, p.start.y);
      } else if (st.shape !== "hold") {
        recenter();
      }
    } else if (st.shape !== "hold") {
      recenter();
    }
    setPhase("trial");
    userStartTsRef.current = Date.now();
  }, [resetTrial, snapCursorToCanvasPoint, recenter]);

  const { countdown, countdownProgress } = useLessonDemoCountdown({
    phase,
    muted,
    language,
    onComplete: beginTrial,
  });

  const configurePath1RailDot = useCallback((el, { inCv, drift }) => {
    const holdTrial = phaseRef.current === "trial" && stageRef.current?.shape === "hold";
    const showRailMark = inCv && (holdTrial || (phaseRef.current === "trial" && drift > 14));
    el.style.visibility = showRailMark ? "visible" : "hidden";
    el.style.width = holdTrial ? "18px" : "12px";
    el.style.height = holdTrial ? "18px" : "12px";
    el.style.background = holdTrial ? "rgba(34,197,94,0.85)" : "rgba(255,255,255,0.35)";
    el.style.borderColor = holdTrial ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)";
  }, []);

  useLessonRailDotLoop({
    displayCursorRef,
    cursorPosRef,
    lessonCursorBridge,
    canvasRef,
    railDotRef,
    configureRailDot: configurePath1RailDot,
  });

  useEffect(() => {
    return () => {
      if (adaptiveHideTimeoutRef.current) {
        clearTimeout(adaptiveHideTimeoutRef.current);
        adaptiveHideTimeoutRef.current = null;
      }
    };
  }, []);

  function handleExit() {
    stopAnnouncement();
    appendSessionLog({
      userId: user?.uid ?? "local",
      mode: 1,
      stage: stage.stage,
      durationMs: sessionTimer.elapsedMs,
      attempts: attempt,
      reinforcementsFired: reinforcement.eventsFired,
      completion: "exit",
    });
    navigate("/lessons");
  }

  function goToUnlockedStage() {
    if (!stageUnlock) return;
    navigate(`/lesson-path1?stage=${stageUnlock.stage}`);
    setStageUnlock(null);
  }

  function stayOnCurrentStage() {
    setStageUnlock(null);
    setAttempt((a) => a + 1);
    resetTrial();
    setPhase("demo");
  }

  const drawGhostBackdrop = useCallback(
    (ctx) => {
      if (!canvasRef.current || !path?.centerline) return;
      const canvas = canvasRef.current;
      ctx.fillStyle = UI_TOKENS.lesson.canvasBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.24)";
      ctx.lineWidth = 28;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path.centerline[0].x, path.centerline[0].y);
      for (let i = 1; i < path.centerline.length; i++) {
        ctx.lineTo(path.centerline[i].x, path.centerline[i].y);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(71, 85, 105, 0.55)";
      ctx.lineWidth = 6;
      ctx.setLineDash([7, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      drawMidDirectionArrow(ctx, path.centerline);
      ctx.beginPath();
      ctx.arc(path.start.x, path.start.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = UI_TOKENS.lesson.success;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(path.end.x, path.end.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = UI_TOKENS.lesson.warning;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.stroke();
    },
    [path],
  );

  const handleGhostDone = useCallback(() => {
    // Stage 0-2 use countdown-based auto-start instead of ghost-end.
    if (stage.stage > 2) beginTrial();
  }, [stage.stage, beginTrial]);

  const StageIcon = STAGE_ICONS[stage.stage] ?? Eye;
  const title = language === "ur" ? stage.titleUr ?? stage.title : stage.title;
  const displayLessonLevel = pathLessonDisplayLevel(1, stage.stage);

  if (sessionTimer.capped) {
    return <BreakPrompt kind="cap" language={language} onExit={handleExit} />;
  }

  const directionName = path?.lessonDirection
    ? path.lessonDirection[0].toUpperCase() + path.lessonDirection.slice(1)
    : null;
  const instruction =
    stage.stage === 0 && directionName
      ? `Move ${directionName}`
      : stage.shape === "hold"
      ? "Move into the bubble and hold for 3 seconds."
      : "Tilt in the path direction to move the trace.";
  const countdownAction =
    stage.stage === 0 && directionName
      ? `Move ${directionName}`
      : stage.shape === "hold"
      ? "Hold Still"
      : "Tilt Forward";
  const showPath1FeedbackCard = phase === "reinforce" || Boolean(adaptiveFeedback);

  const hudInstruction = useMemo(() => {
    if (phase === "demo") return language === "ur" ? "تیار ہو جائیں…" : "Get ready…";
    if (phase === "reinforce") return language === "ur" ? "شاباش!" : "Nice work!";
    return instruction;
  }, [phase, language, instruction]);

  const liveProgressPct =
    phase === "trial" && path?.centerline?.length
      ? stage.shape === "hold"
        ? Math.round(holdProgress * 100)
        : Math.min(
            100,
            Math.round((fillHead / Math.max(1, path.centerline.length - 1)) * 100),
          )
      : 0;
  const progressAccentColor = adherenceBarColorFromStrokeScale(liveProgressPct);

  const sidebarFooter =
    phase === "trial" ? (
      <div
        className="w-full shrink-0 rounded-2xl border-2 p-3 shadow-md transition-[background-color,border-color] duration-300 sm:p-3.5"
        role="status"
        aria-live="polite"
        aria-label={
          language === "ur"
            ? `پیشرفت ${liveProgressPct} فیصد`
            : `Progress ${liveProgressPct} percent`
        }
        style={{
          boxShadow: "var(--easeL-cartoon-shadow-sm)",
          background: `color-mix(in srgb, ${progressAccentColor} 26%, white)`,
          borderColor: `color-mix(in srgb, ${progressAccentColor} 52%, var(--easeL-border-strong))`,
          color: "var(--easeL-text)",
        }}
      >
        <p
          className="text-[0.65rem] font-bold uppercase tracking-[0.08em]"
          style={{
            color: `color-mix(in srgb, ${progressAccentColor} 35%, var(--easeL-text-muted))`,
          }}
        >
          {language === "ur" ? "لائیو پیش قدمی" : "Live progress"}
        </p>
        <p
          className="mt-1 text-[0.72rem] leading-snug"
          style={{
            color: `color-mix(in srgb, ${progressAccentColor} 22%, var(--easeL-text))`,
            opacity: 0.92,
          }}
        >
          {stage.shape === "hold"
            ? language === "ur"
              ? "بلب میں قائم رہیں"
              : "Stay in the bubble"
            : language === "ur"
              ? "لکیر مکمل کریں"
              : "Keep tracing the line"}
        </p>
        <div
          className="mt-3 border-t pt-3"
          style={{
            borderColor: `color-mix(in srgb, ${progressAccentColor} 28%, rgba(0,0,0,0.12))`,
          }}
        >
          <span
            className="text-[1.65rem] font-extrabold tabular-nums leading-none tracking-tight sm:text-[1.75rem]"
            style={{
              color: `color-mix(in srgb, ${progressAccentColor} 40%, var(--easeL-text))`,
            }}
          >
            {liveProgressPct}
            <span className="text-lg font-bold opacity-75">%</span>
          </span>
        </div>
        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full border"
          style={{
            borderColor: `color-mix(in srgb, ${progressAccentColor} 22%, rgba(0,0,0,0.1))`,
            background: `color-mix(in srgb, ${progressAccentColor} 14%, rgb(245 245 245))`,
          }}
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-[width,background-color] duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, liveProgressPct))}%`,
              backgroundColor: progressAccentColor,
            }}
          />
        </div>
      </div>
    ) : null;

  return (
    <>
      <MasteryToast message={masteryToast} language={language} />
      <LessonInstructionCard
        stage={stage.stage}
        mode={1}
        language={language}
        active={phase === "trial"}
        dismissSignal={instructionDismiss}
      />

      <LessonShell
        videoRef={videoRef}
        headerBadge={
          <>
            <StageIcon className="easeL-accent-text-strong h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold" style={{ color: "var(--easeL-text-muted)" }}>
              Level {displayLessonLevel}
            </span>
            <span
              className="w-full basis-full truncate text-base font-bold sm:w-auto sm:basis-auto"
              style={{ color: "var(--easeL-text)" }}
            >
              {title}
            </span>
          </>
        }
        caregiverControlsVisible={caregiverControlsVisible}
        onRevealCaregiverTools={revealCaregiverControls}
        toolbar={
          <LessonToolbar
            language={language}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onRecenter={recenter}
            onExit={handleExit}
            buttonRefs={buttonRefs}
            size="compact"
          />
        }
        hudInstruction={hudInstruction}
        elapsedMs={sessionTimer.elapsedMs}
        sidebarFooter={sidebarFooter}
      >
        <div
          className="relative w-full lg:mx-0"
          style={{
            maxWidth: `min(1240px, 100%, calc((100vh - 18rem) * ${CANVAS_WIDTH} / ${CANVAS_HEIGHT}))`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="rounded-2xl border-2 bg-white transition-[box-shadow,ring]"
            style={{
              width: "100%",
              height: "auto",
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              verticalAlign: "top",
              display: "block",
              borderColor: "var(--easeL-border-strong)",
              boxShadow: "var(--easeL-cartoon-shadow-sm)",
            }}
          />
        </div>

        <div className="mt-2 w-full sm:mt-3">
          <div className={`${phase === "trial" ? "opacity-100" : "opacity-0"} transition-opacity`}>
            <div
              className="mb-1.5 flex items-center justify-between text-xs font-semibold sm:text-sm"
              style={{ color: "var(--easeL-text-muted)" }}
            >
              <span>{language === "ur" ? "ترقی" : "Progress"}</span>
              <span className="tabular-nums font-semibold" style={{ color: "var(--easeL-text)" }}>
                {liveProgressPct}%
              </span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full border-2 shadow-inner"
              style={{
                borderColor: "var(--easeL-border-subtle)",
                background: "color-mix(in srgb, var(--easeL-bg-section) 85%, var(--easeL-border-subtle) 15%)",
              }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{
                  width: `${liveProgressPct}%`,
                  backgroundColor: "var(--easeL-primary)",
                }}
              />
            </div>
          </div>
        </div>
      </LessonShell>

      <LessonRailDot railDotRef={railDotRef} />

      <GhostStrokePreview
        canvasRef={canvasRef}
        centerline={phase === "demo" && stage.shape !== "hold" ? path?.centerline : null}
        active={phase === "demo" && stage.shape !== "hold"}
        drawBackdrop={drawGhostBackdrop}
        onDone={handleGhostDone}
      />

      {/* No explicit "Try it now" button — the ghost preview auto-advances to
          the trial via its onDone callback so the demo phase is an ambient
          hint, not a gated step the user has to click through. */}

      <LessonDemoCountdownOverlay
        countdown={phase === "demo" ? countdown : null}
        countdownProgress={countdownProgress}
        language={language}
        subtitle={countdownAction}
      />

      {showPath1FeedbackCard && (
        <div className="fixed top-[230px] left-1/2 z-40 -translate-x-1/2 pointer-events-none">
          <div
            className={`min-w-[560px] max-w-[96vw] rounded-3xl border px-7 py-5 shadow-2xl backdrop-blur-sm ${
              phase === "reinforce"
                ? "bg-emerald-50/95 border-emerald-200"
                : "bg-amber-50/95 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-full ${
                  phase === "reinforce" ? "bg-emerald-100" : "bg-amber-100"
                }`}
              >
                {phase === "reinforce" ? (
                  <CircleCheck className="h-6 w-6 text-emerald-600" />
                ) : (
                  <CircleX className="h-6 w-6 text-amber-700" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold uppercase tracking-wide ${
                    phase === "reinforce" ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {phase === "reinforce" ? "Cleared!" : "Oops!"}
                </p>
                <p className="text-2xl font-extrabold text-slate-800 leading-tight">
                  {phase === "reinforce"
                    ? language === "ur"
                      ? "شاباش!"
                      : "Good job!"
                    : adaptiveFeedback?.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stageUnlock && (
        <div className="easeL-result-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="easeL-result-modal w-full max-w-md p-6">
            <p className="easeL-accent-text-strong text-xs font-semibold tracking-wide">
              {language === "ur" ? "شاباش" : "Well done"}
            </p>
            <h3 className="mt-1 text-2xl font-bold" style={{ color: "var(--easeL-text)" }}>
              {language === "ur" ? "بہت اچھا!" : "Good job!"}
            </h3>
            <p className="mt-2" style={{ color: "var(--easeL-text-muted)" }}>
              {language === "ur"
                ? `${stageUnlock.title} کے لیے تیار ہیں؟`
                : `Ready to try ${stageUnlock.title}?`}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={goToUnlockedStage}
                className="easeL-btn-solid flex-1"
              >
                {language === "ur" ? "اگلا لیول" : "Go to next level"}
              </button>
              <button
                type="button"
                onClick={stayOnCurrentStage}
                className="easeL-btn-outline flex-1 min-h-11 font-semibold"
              >
                {language === "ur" ? "یہی جاری رکھیں" : "Stay on this level"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "complete" && stage.stage === 0 && (
        <div className="easeL-result-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="easeL-result-modal w-full max-w-md p-6">
            <p className="easeL-accent-text-strong text-xs font-semibold tracking-wide">
              {language === "ur" ? "مبارک ہو" : "Congratulations"}
            </p>
            <h3 className="mt-1 text-2xl font-bold" style={{ color: "var(--easeL-text)" }}>
              {language === "ur" ? "سمت سیکھی مکمل" : "Directions complete"}
            </h3>
            <p className="mt-2" style={{ color: "var(--easeL-text-muted)" }}>
              {language === "ur"
                ? "آپ نے تمام سمتوں میں مہارت حاصل کی ہے۔"
                : "You've mastered all directions!"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {["left", "right", "up", "down"].map((dir) => (
                <div
                  key={dir}
                  className="rounded-lg border-2 p-3 text-center"
                  style={{
                    borderColor: stage0Mastery?.[dir]
                      ? "var(--easeL-accent-success)"
                      : "var(--easeL-border-subtle)",
                    background: stage0Mastery?.[dir]
                      ? "color-mix(in srgb, var(--easeL-accent-success) 8%, white)"
                      : "transparent",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--easeL-text)" }}>
                    {language === "ur"
                      ? {
                          left: "بائیں",
                          right: "دائیں",
                          up: "اوپر",
                          down: "نیچے",
                        }[dir]
                      : dir.charAt(0).toUpperCase() + dir.slice(1)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--easeL-text-muted)" }}>
                    {stage0Mastery?.[dir] ? "✓" : "—"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPhase("demo");
                  setStage(getStage(1));
                }}
                className="easeL-btn-solid flex-1"
              >
                {language === "ur" ? "اگلا لیول" : "Next level"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase("demo");
                  setAttempt(0);
                }}
                className="easeL-btn-outline flex-1 min-h-11 font-semibold"
              >
                {language === "ur" ? "دوبارہ کریں" : "Practice again"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReinforcementBurst
        active={reinforcement.active}
        lowStimulation={lowStim}
      />

      {sessionTimer.onBreak && (
        <BreakPrompt
          kind="break"
          language={language}
          onResume={sessionTimer.endBreak}
          onExit={handleExit}
        />
      )}
    </>
  );
}
