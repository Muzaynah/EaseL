import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Target as TargetIcon, Play, Volume2, VolumeX, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useGestureControl } from "../hooks/useGestureControl";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useReinforcement } from "../hooks/useReinforcement";
import { useSessionTimer } from "../hooks/useSessionTimer";
import ReinforcementBurst from "../components/ReinforcementBurst";
import BreakPrompt from "../components/BreakPrompt";
import GhostStrokePreview from "../components/GhostStrokePreview";
import LessonInstructionCard from "../components/LessonInstructionCard";
import Cursor from "../components/Cursor";
import MasteryToast from "../components/MasteryToast";
import TroubleshootAssist from "../components/TroubleshootAssist";
import { getStage } from "../utils/lessonContent";
import { getStageLessonPath } from "../utils/lessonPath";
import { appendTrialLog, appendSessionLog, getTrialLog } from "../utils/persistence";
import { getEffectiveActivationMethod } from "../utils/profileSchema";
import { resolveActivationConfig } from "../utils/activationConfig";
import { sayPhrase, stopSpeech, speakInstruction } from "../utils/screenerAudio";
import {
  filterTrials,
  getAdaptedStage,
  maybeAdvanceStage,
  computeFatigueIndex,
  evaluateMastery,
  getMasteryFeedback,
} from "../utils/stageAdaptation";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
// Full-fill time for the Stage 0 "any movement = fill" animation.  Shorter =
// more immediate cause-and-effect feedback.  2.5 s feels instant to a child
// while still giving caregivers time to confirm the movement was deliberate.
const STAGE0_FILL_MS = 2500;
const AUTOCOMPLETE_MS = 1400;

const STAGE_ICONS = { 0: Eye, 1: TargetIcon, 2: Play };

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
export default function Path1Lesson() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, updateProfile } = useAuth();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const cursorElRef = useRef(null);
  const buttonRefs = useRef({});
  const userStartTsRef = useRef(null);
  const activationErrorsRef = useRef(0);
  const mouthEventsRef = useRef(0);
  const jitterSamplesRef = useRef([]);
  const lastFillTickRef = useRef(null);
  const fillHeadRef = useRef(0);
  const holdStartRef = useRef(null);
  const lastCursorXRef = useRef(null);
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
  // Framework §5.4 / §9.3 — if the user's last ~10 trials show a significant
  // performance drop, we shorten the break interval silently so the next
  // "take a breath" prompt lands sooner.  Gradual, not abrupt.
  const breakIntervalMs = useMemo(() => {
    const recent = (typeof window !== "undefined" ? getTrialLog() : []).slice(-10);
    const fatigue = computeFatigueIndex(recent);
    if (fatigue >= 0.5) return 3 * 60 * 1000;
    if (fatigue >= 0.25) return 4 * 60 * 1000;
    return 5 * 60 * 1000;
  }, [user?.uid]);
  const sessionTimer = useSessionTimer({
    capMinutes: profile?.sessionLengthPreference ?? 15,
    breakIntervalMs,
  });

  const [phase, setPhase] = useState("demo"); // demo | trial | reinforce
  const [attempt, setAttempt] = useState(0);
  const [fillHead, setFillHead] = useState(0);
  const [path, setPath] = useState(null);
  const [muted, setMuted] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [masteryToast, setMasteryToast] = useState(null);
  const [instructionDismiss, setInstructionDismiss] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [stageUnlock, setStageUnlock] = useState(null);
  const [masteryHint, setMasteryHint] = useState("");
  const [attemptFeedback, setAttemptFeedback] = useState("");

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
    lastCursorXRef.current = null;
  }, []);

  const advanceAttempt = useCallback((success, extraMetrics = {}) => {
    if (phaseRef.current === "reinforce") return;
    const st = stageRef.current;
    const duration = userStartTsRef.current != null ? Date.now() - userStartTsRef.current : 0;
    const jitter =
      jitterSamplesRef.current.length > 0
        ? jitterSamplesRef.current.reduce((a, b) => a + b, 0) / jitterSamplesRef.current.length
        : 0;
    appendTrialLog({
      userId: user?.uid ?? "local",
      mode: 1,
      stage: st.stage,
      attempt: attempt + 1,
      shape: st.shape,
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
    const staged = filterTrials(getTrialLog(), {
      userId: user?.uid ?? "local",
      mode: 1,
      stage: st.stage,
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
          ? "بہت خوب! اگلی بار تھوڑا اور ساکن رہیں۔"
          : "Great hold. Try staying still a little longer next time.",
      );
    } else {
      setAttemptFeedback(
        language === "ur"
          ? "بہت اچھا! اسی طرح حرکت جاری رکھیں۔"
          : "Great movement. Keep this same smooth pace.",
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
        updateProfile({ ...profile, currentStage: next });
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
      setAttempt((a) => a + 1);
      resetTrial();
      setPhase("demo");
    }, 1400);
  }, [attempt, effectiveActivation, reinforcement, user?.uid, resetTrial, profile, updateProfile, searchParams, language]);

  useEffect(() => {
    const p = getStageLessonPath(adaptedStage, attempt, CANVAS_WIDTH, CANVAS_HEIGHT);
    setPath(p);
    resetTrial();
  }, [adaptedStage, attempt, resetTrial]);

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

  const { processLandmarks } = useGestureControl({
    cursorPosRef,
    activationMethod: effectiveActivation,
    onPenToggle: handleActivation,
    onMouthEvent: () => {
      mouthEventsRef.current += 1;
    },
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
  const canvasToScreen = useCallback((cx, cy) => {
    const el = canvasRef.current;
    if (!el) return { x: cx, y: cy };
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + (cx / CANVAS_WIDTH) * rect.width,
      y: rect.top + (cy / CANVAS_HEIGHT) * rect.height,
    };
  }, []);

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
      const canvasX = ((cursorPosRef.current.x - rect.left) / rect.width) * canvas.width;
      const canvasY = ((cursorPosRef.current.y - rect.top) / rect.height) * canvas.height;

      // Stage 0 — Cause→Effect: ANY horizontal cursor movement fills the bar.
      // Teaches direct cause-effect: "I move, something happens." Direction-agnostic.
      if (st.shape === "straight" && st.stage === 0 && pathRef.current.centerline) {
        const center = pathRef.current.centerline;
        const len = center.length;
        const halfIndex = (len - 1) * 0.5;

        if (lastCursorXRef.current == null) lastCursorXRef.current = canvasX;
        const moved = Math.abs(canvasX - lastCursorXRef.current);
        lastCursorXRef.current = canvasX;

        const now = performance.now();
        if (moved > 1) {
          // Fill at a rate proportional to how fast the cursor is moving, capped.
          const perMs = halfIndex / STAGE0_FILL_MS;
          const elapsed = lastFillTickRef.current != null ? now - lastFillTickRef.current : 16;
          const speedMultiplier = Math.min(3, moved / 3); // visual reward for bigger moves
          const add = Math.min(
            elapsed * perMs * (0.6 + speedMultiplier),
            halfIndex - fillHeadRef.current,
          );
          fillHeadRef.current = Math.min(fillHeadRef.current + add, halfIndex);
          setFillHead(fillHeadRef.current);
          lastFillTickRef.current = now;
          if (fillHeadRef.current >= halfIndex - 0.001) {
            autocompleteFrom(halfIndex);
          }
        } else {
          lastFillTickRef.current = now;
        }

        // Glue the visible cursor to the leading edge of the fill so the
        // trace reads as one cohesive object ("my movement pulls this dot
        // along the line").  Because the fill advances from a rate-capped
        // source, the cursor can never jump — it tracks the fill which
        // itself grows smoothly from the start.
        const i = Math.min(center.length - 1, Math.floor(fillHeadRef.current));
        const frac = fillHeadRef.current - i;
        const a = center[i];
        const b = center[Math.min(center.length - 1, i + 1)];
        const tipX = a.x + frac * (b.x - a.x);
        const tipY = a.y + frac * (b.y - a.y);
        const screen = canvasToScreen(tipX, tipY);
        displayCursorRef.current.x = screen.x;
        displayCursorRef.current.y = screen.y;
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

      // Stage 2 — any cursor movement arms the activation; the ACTIVATION fires
      // onPenToggle.  Visible cursor rides the partial fill so users can see
      // what "armed" looks like.
      if (st.shape === "straight" && st.stage === 2 && pathRef.current.centerline) {
        const center = pathRef.current.centerline;
        const halfIndex = (center.length - 1) * 0.35;
        if (lastCursorXRef.current == null) lastCursorXRef.current = canvasX;
        const moved = Math.abs(canvasX - lastCursorXRef.current);
        lastCursorXRef.current = canvasX;
        if (moved > 1) {
          const step = Math.min(0.3, moved / 8);
          fillHeadRef.current = Math.min(fillHeadRef.current + step, halfIndex);
          setFillHead(fillHeadRef.current);
          if (fillHeadRef.current >= halfIndex - 0.001) {
            autocompleteFrom(halfIndex);
          }
        }
        // Mirror the Stage-0 behaviour: the cursor rides the fill tip so
        // the user sees a single object advancing along the line.
        const i = Math.min(center.length - 1, Math.floor(fillHeadRef.current));
        const frac = fillHeadRef.current - i;
        const a = center[i];
        const b = center[Math.min(center.length - 1, i + 1)];
        const tipX = a.x + frac * (b.x - a.x);
        const tipY = a.y + frac * (b.y - a.y);
        const screen = canvasToScreen(tipX, tipY);
        displayCursorRef.current.x = screen.x;
        displayCursorRef.current.y = screen.y;
      }
    }

    drawScene();
  }, [updateCursorFromLandmarks, processLandmarks, cursorPosRef, tiltStateRef, advanceAttempt, canvasToScreen]);

  const { startFaceMesh } = useFaceMesh({ videoRef, onResults: onFaceResults });

  // Wait 150ms before starting face mesh. This matches every other page in the
  // app (Tutorial, Calibration, PathScreener, CanvasPage) and avoids React
  // StrictMode's double-invocation racing two camera starts on the same video
  // element, which would leave the face mesh wedged and the cursor frozen.
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
    if (muted) {
      stopSpeech();
      return;
    }
    if (phase === "demo") {
      const key = stage.shape === "hold" ? "holdStill" : "tiltTowardTarget";
      sayPhrase("watchMe", language);
      setTimeout(() => sayPhrase(key, language), 1400);
    }
    return () => stopSpeech();
  }, [phase, stage, language, muted]);

  // Visible head-cursor.  Follows displayCursorRef (not cursorPosRef) so the
  // dot can be "snapped" onto the lesson path during Stage 0 / Stage 2 trials.
  // A small exponential smoother stabilises micro-jitter at display time —
  // the underlying tracking math is untouched.
  useEffect(() => {
    let raf;
    const smoothed = { x: displayCursorRef.current.x, y: displayCursorRef.current.y };
    const loop = () => {
      const target = displayCursorRef.current;
      smoothed.x += (target.x - smoothed.x) * 0.35;
      smoothed.y += (target.y - smoothed.y) * 0.35;
      if (cursorElRef.current) {
        cursorElRef.current.style.left = smoothed.x + "px";
        cursorElRef.current.style.top = smoothed.y + "px";
      }
      raf = requestAnimationFrame(loop);
    };
    // Seed to window centre until face mesh delivers something.
    if (typeof window !== "undefined") {
      displayCursorRef.current.x = window.innerWidth / 2;
      displayCursorRef.current.y = window.innerHeight / 2;
      smoothed.x = displayCursorRef.current.x;
      smoothed.y = displayCursorRef.current.y;
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function autocompleteFrom(fromIndex) {
    const center = pathRef.current?.centerline;
    if (!center?.length) return;
    const toIndex = center.length - 1;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / AUTOCOMPLETE_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const head = fromIndex + eased * (toIndex - fromIndex);
      fillHeadRef.current = head;
      setFillHead(head);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        advanceAttempt(true, { intentAligned: true, autocompleted: true });
      }
    };
    requestAnimationFrame(step);
  }

  function drawScene() {
    const canvas = canvasRef.current;
    if (!canvas || !pathRef.current?.centerline?.length) return;
    if (phaseRef.current === "demo" && stageRef.current.shape !== "hold") {
      // Ghost preview owns the canvas during demo phase.
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FAFAFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const p = pathRef.current;
    const center = p.centerline;
    const st = stageRef.current;

    if (st.shape === "hold") {
      // Big friendly target. Outer dashed ring + inner pulse + sweep arc.
      ctx.beginPath();
      ctx.arc(p.start.x, p.start.y, p.holdRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 102, 241, 0.14)";
      ctx.fill();
      ctx.strokeStyle = "#6366F1";
      ctx.lineWidth = 5;
      ctx.setLineDash([14, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Center dot as target
      ctx.beginPath();
      ctx.arc(p.start.x, p.start.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#4F46E5";
      ctx.fill();
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
        ctx.strokeStyle = "#22C55E";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      return;
    }

    ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(center[0].x, center[0].y);
    for (let i = 1; i < center.length; i++) ctx.lineTo(center[i].x, center[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    let tipX = center[0].x;
    let tipY = center[0].y;
    if (fillHead > 0) {
      ctx.strokeStyle = "#6366F1";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(center[0].x, center[0].y);
      const lastI = Math.floor(fillHead);
      for (let i = 1; i <= lastI && i < center.length; i++) ctx.lineTo(center[i].x, center[i].y);
      if (fillHead > lastI && lastI + 1 < center.length) {
        const frac = fillHead - lastI;
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
    ctx.fillStyle = "#16A34A";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.end.x, p.end.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#F59E0B";
    ctx.fill();

    // Pen-tip glow at the leading edge of the fill.  This doubles up with the
    // on-screen cursor (which is also snapped here) so it reads as ONE marker
    // even on low-contrast displays.
    if (phaseRef.current === "trial" && fillHead > 0) {
      ctx.beginPath();
      ctx.arc(tipX, tipY, 22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99,102,241,0.18)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tipX, tipY, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#4338CA";
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
      if (st.shape === "hold") {
        snapCursorToCanvasPoint(p.start.x, p.start.y);
      } else if (p.start) {
        snapCursorToCanvasPoint(p.start.x, p.start.y);
      } else {
        recenter();
      }
    } else {
      recenter();
    }
    setPhase("trial");
    userStartTsRef.current = Date.now();
  }, [resetTrial, snapCursorToCanvasPoint, recenter]);

  // Stage 0-2 are intent-first lessons: start automatically after a short
  // spoken 3-2-1 countdown; no mouth toggle needed.
  useEffect(() => {
    if (phase !== "demo") {
      setCountdown(null);
      return undefined;
    }
    let current = 3;
    setCountdown(current);
    if (!muted) speakInstruction(String(current), { language });
    const id = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(id);
        setCountdown(null);
        beginTrial();
        return;
      }
      setCountdown(current);
      if (!muted) speakInstruction(String(current), { language });
    }, 900);
    return () => clearInterval(id);
  }, [phase, beginTrial, muted, language]);

  function handleExit() {
    stopSpeech();
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

  const StageIcon = STAGE_ICONS[stage.stage] ?? Eye;
  const title = language === "ur" ? stage.titleUr ?? stage.title : stage.title;
  const fillRatio =
    path?.centerline?.length && fillHead > 0
      ? Math.min(1, fillHead / (path.centerline.length - 1))
      : 0;

  if (sessionTimer.capped) {
    return <BreakPrompt kind="cap" language={language} onExit={handleExit} />;
  }

  const instruction =
    phase === "demo"
      ? language === "ur"
        ? "پہلے میں دکھاتا ہوں…"
        : "Watch the shape fill in…"
      : stage.shape === "hold"
      ? language === "ur"
        ? "بڑے دائرے کے اندر آ کر ٹھہر جائیں۔"
        : "Move the cursor into the circle and hold still."
      : stage.stage === 2
      ? language === "ur"
        ? "سر حرکت دیں — لکیر خود مکمل ہوگی۔"
        : "Move your head — the line will complete automatically."
      : language === "ur"
      ? "سر کو ہلائیں — لکیر بھرتی جائے گی۔"
      : "Move your head — the line fills in as you move.";

  // Live mood feedback — mirrors Mode 2's accuracy pill but reads Stage-0/2
  // fill progress or Stage 1 hold progress, whichever the current stage uses.
  // The pill gets a warm green glow once the user is more than halfway to
  // success; stays neutral indigo otherwise.
  const m1Pct = Math.round(
    (stage.shape === "hold" ? holdProgress : fillRatio) * 100,
  );
  const m1Mood = m1Pct >= 60 ? "good" : "neutral";
  const m1CanvasMood =
    m1Mood === "good" ? "ring-4 ring-emerald-300/60" : "ring-0";

  return (
    <div
      className="relative w-screen min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 flex flex-col items-center pt-20 pb-4 px-4 overflow-hidden"
      style={{ cursor: "none" }}
    >
      <MasteryToast message={masteryToast} language={language} />
      <LessonInstructionCard
        stage={stage.stage}
        mode={1}
        language={language}
        active={phase === "trial"}
        dismissSignal={instructionDismiss}
      />
      <div className="w-full max-w-[1200px] flex items-center justify-between gap-3 mb-2 z-20 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/95 shadow border border-slate-200/80">
          <StageIcon className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Level {stage.stage}
          </span>
          <span className="text-slate-800 font-bold text-base">{title}</span>
        </div>

        {phase === "trial" && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shadow-sm transition-colors ${
              m1Mood === "good"
                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                : m1Mood === "off"
                ? "bg-rose-100 text-rose-700 border-rose-300"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
          >
            {m1Mood === "good" && <CheckCircle2 className="w-4 h-4" />}
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
              {stage.shape === "hold"
                ? language === "ur"
                  ? "روکنا"
                  : "Hold"
                : language === "ur"
                ? "ترقی"
                : "Progress"}
            </span>
            <span className="text-xl font-extrabold tabular-nums">{m1Pct}%</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <TroubleshootAssist />
          <button
            type="button"
            onClick={recenter}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm text-sm"
            title="Recenter cursor"
          >
            <RefreshCw className="w-4 h-4" />
            {language === "ur" ? "مرکز" : "Recenter"}
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm text-sm"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {language === "ur" ? (muted ? "آواز بند" : "آواز") : muted ? "Muted" : "Sound"}
          </button>
          <button
            onClick={handleExit}
            className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold shadow-sm border-2 border-slate-300 text-sm"
          >
            <LogOut className="w-4 h-4" />
            {language === "ur" ? "ختم" : "Exit"}
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mb-3 z-10">
        <div className="rounded-xl bg-indigo-600 text-white px-4 py-2 shadow border border-indigo-700/50 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{instruction}</p>
          <span className="text-xs font-medium text-indigo-100 bg-indigo-800/40 px-2 py-1 rounded-lg">
            {Math.floor(sessionTimer.elapsedMs / 60000)}:
            {String(Math.floor((sessionTimer.elapsedMs % 60000) / 1000)).padStart(2, "0")}
          </span>
        </div>
        {masteryHint ? (
          <div className="mt-2 rounded-xl bg-white/90 border border-indigo-200 text-indigo-800 px-3 py-2 text-xs font-semibold">
            {masteryHint}
          </div>
        ) : null}
        {attemptFeedback ? (
          <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 text-xs font-semibold">
            {attemptFeedback}
          </div>
        ) : null}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={`rounded-3xl shadow-2xl border-2 border-slate-200/90 bg-white transition-[box-shadow] ${m1CanvasMood}`}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          maxWidth: `min(1100px, calc((100vh - 260px) * ${CANVAS_WIDTH} / ${CANVAS_HEIGHT}))`,
        }}
      />

      {phase === "trial" && (
        <div className="w-full max-w-[1200px] mt-2 px-2 z-20">
          <div className="flex items-center justify-between mb-1 text-xs font-semibold text-slate-600">
            <span>
              {stage.shape === "hold"
                ? language === "ur"
                  ? "روکنا"
                  : "Holding"
                : language === "ur"
                ? "ترقی"
                : "Progress"}
            </span>
            <span className="tabular-nums text-slate-500">{m1Pct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
            <div
              className={`h-full ${
                m1Mood === "good" ? "bg-emerald-500" : "bg-indigo-500"
              } transition-[width,background-color] duration-200 rounded-full`}
              style={{ width: `${m1Pct}%` }}
            />
          </div>
        </div>
      )}

      <GhostStrokePreview
        canvasRef={canvasRef}
        centerline={phase === "demo" && stage.shape !== "hold" ? path?.centerline : null}
        active={phase === "demo" && stage.shape !== "hold"}
        drawBackdrop={(ctx) => {
          if (!canvasRef.current || !path?.centerline) return;
          const canvas = canvasRef.current;
          ctx.fillStyle = "#FAFAFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
          ctx.lineWidth = 16;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.setLineDash([12, 12]);
          ctx.beginPath();
          ctx.moveTo(path.centerline[0].x, path.centerline[0].y);
          for (let i = 1; i < path.centerline.length; i++)
            ctx.lineTo(path.centerline[i].x, path.centerline[i].y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(path.start.x, path.start.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = "#16A34A";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(path.end.x, path.end.y, 20, 0, Math.PI * 2);
          ctx.fillStyle = "#F59E0B";
          ctx.fill();
        }}
        onDone={() => {
          // Stage 0-2 now use countdown-based auto-start instead of ghost-end.
          if (stage.stage > 2) beginTrial();
        }}
      />

      {/* No explicit "Try it now" button — the ghost preview auto-advances to
          the trial via its onDone callback so the demo phase is an ambient
          hint, not a gated step the user has to click through. */}

      {phase === "demo" && countdown != null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-white/95 border-2 border-indigo-300 shadow-xl flex items-center justify-center">
            <span className="text-4xl font-extrabold text-indigo-700 tabular-nums">{countdown}</span>
          </div>
        </div>
      )}

      {stageUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {language === "ur" ? "مبارک ہو" : "Congratulations"}
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-800">
              {language === "ur" ? "نیا لیول کھل گیا" : "New level unlocked"}
            </h3>
            <p className="mt-2 text-slate-600">
              {language === "ur"
                ? `آپ ${stageUnlock.title} پر جا سکتے ہیں۔`
                : `You can now move to ${stageUnlock.title}.`}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={goToUnlockedStage}
                className="flex-1 min-h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow"
              >
                {language === "ur" ? "اگلا لیول" : "Go to next level"}
              </button>
              <button
                type="button"
                onClick={stayOnCurrentStage}
                className="flex-1 min-h-11 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
              >
                {language === "ur" ? "یہی جاری رکھیں" : "Stay on this level"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Head cursor — always visible, always indigo (no grey "off" state).
          During a trial we render it as a solid pen-tip so it reads as the
          same object as the fill that's advancing on the canvas. */}
      <Cursor
        ref={cursorElRef}
        size={24}
        color="#4338CA"
        isPenDown={phase === "trial"}
        tool="pencil"
      />

      <div className="fixed bottom-4 right-4 z-20 w-32 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-900 shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full scale-x-[-1] object-cover"
          style={{ aspectRatio: "4/3" }}
        />
      </div>

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
    </div>
  );
}
