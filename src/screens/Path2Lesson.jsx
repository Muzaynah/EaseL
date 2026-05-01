import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Volume2,
  VolumeX,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Pause,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCursorPositionBridgeRef } from "../context/CursorPositionBridgeContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useGestureControl } from "../hooks/useGestureControl";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useSessionTimer } from "../hooks/useSessionTimer";
import BreakPrompt from "../components/BreakPrompt";
import GhostStrokePreview from "../components/GhostStrokePreview";
import LessonInstructionCard from "../components/LessonInstructionCard";
import MasteryToast from "../components/MasteryToast";
import TroubleshootAssist from "../components/TroubleshootAssist";
import {
  getStage,
  getEffectiveLessonVariant,
  lessonCountInStage,
  lessonIndexWithinStage,
  lessonVariantDisplayName,
} from "../utils/lessonContent";
import { getStageLessonPath } from "../utils/lessonPath";
import { distanceToPath, getNearestPointOnPath } from "../utils/lessonPath";
import { calculateAdherence } from "../utils/corridorGeometry";
import { getCanvasCoordinates } from "../utils/canvasUtils";
import { appendSessionLog, getTrialLog } from "../utils/persistence";
import { resolveActivationConfig } from "../utils/activationConfig";
import {
  sayPhrase,
  stopSpeech,
  playSuccessBeep,
  playCheerSound,
  speakInstruction,
} from "../utils/screenerAudio";
import { saveLessonResultCloud } from "../firebase/cloudData";
import {
  filterTrials,
  getAdaptedStage,
  computeFatigueIndex,
  STAGE_UNLOCK_ADHERENCE,
} from "../utils/stageAdaptation";
import Path2RewardModal from "./path2Lesson/Path2RewardModal";
import { usePath2InputCageController } from "./path2Lesson/usePath2InputCageController";
import { usePath2ScoringProgression } from "./path2Lesson/usePath2ScoringProgression";
import {
  PREVIEW_COLOR,
  STROKE_QUALITY_HEX,
  TRACE_WIDTH,
  VISUAL_CORRIDOR_SCALE,
  buildVertexQualityFills,
  drawCenterlineByTiers,
  effectiveScoringWidth,
  lessonPointInsideCanvas,
  normalizePathToSegmentStart,
  path2DrawDecorations,
  path2FillBackgroundAndRoad,
  qualityTierFromDistance,
  traceSampleStyleFromDistance,
  wobbleBeadColor,
} from "./path2Lesson/traceUtils";
import { UI_TOKENS } from "../theme/uiTokens";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
/** Duration of score % animation, sprinkles, and cheer — kept in sync (ms). */
const SCORE_REVEAL_MS = 800;
/** Hold mouth open outside canvas → pause lesson (unlock universal cursor navigation). */
const LESSON_PAUSE_HOLD_MS = 3000;
// Max |Δ path index| per frame. Forward: smooth growth; backward: re-sync
// when the user re-enters the corridor or their true path position is
// behind the visible stroke tip (nearest-point can only move monotonically
// forward with the old forward-only rule).
const MAX_RAIL_SYNC_PER_FRAME = 3;
// Allow the tip to sit a hair ahead of the true projection (feel), never far ahead.
const RAIL_AHEAD_SLACK = 0.12;
// Auto-finish a segment once the rail tip is at least this far along.  Open
// corridors already finish at this; closed single-segment shapes (circle,
// sun) also use this bound since they are one long segment.
const AUTO_FINISH_PROGRESS = 0.9;
// Dotted preview colour for the not-yet-drawn portion of the active segment.
const GUIDE_PROGRESS_PER_MS = 0.035;
const GUIDE_AHEAD_BUFFER = 14;
// Do not penalize a child for simply pausing. We only sample for adherence
// when there is meaningful movement/progress, not every frame.
const ADHERENCE_MIN_SAMPLE_DIST = 4;
const ADHERENCE_MIN_SAMPLE_MS = 140;
const START_LOCK_MS = 420;
const OFF_CORRIDOR_HARD_MULTIPLIER = 1.15;
const OFF_CORRIDOR_SOFT_MULTIPLIER = 1.02;
const CAREGIVER_CONTROLS_HIDE_MS = 2400;
const CAREGIVER_MOUSE_REVEAL_DELTA = 24;
const DEMO_COUNTDOWN_MS = 2700;
const DEMO_COUNTDOWN_STEP_MS = 900;
const LESSON_CAGE_PADDING = 20;
const CANCEL_TRACE_FADE_MS = 420;


/**
 * Mode 2 (Guided Control) — stages 3-6.
 *
 * Framework alignment:
 *   §3.3 rolling-neutral cursor   §3.4 dwell fallback
 *   §6.1 demonstration-first ghost preview (now faint + fast, just a hint)
 *   §6.2 session timer + breaks + cap
 *   §6.4 staged ladder with segmented polygons for square/triangle/kite/house
 *   §7.2 per-trial metrics aggregated across segments
 *   §8.3 mandatory reinforcement after every attempt
 *   §9.2 saves only derived metrics
 *
 * Intuitiveness layer (this revision):
 *   - Polygons are split into per-side segments so the user draws one line
 *     at a time with a fresh start dot and their own auto-finish.  Each side
 *     is a discrete win.
 *   - The on-canvas trace follows the rail; the stroke is filled with a
 *     green→red gradient from live distance-to-path. Deviation dots and
 *     wobble beads are secondary; HTML cursor colour matches the stroke.
 *   - On entering a trial or advancing to the next segment, the cursor is
 *     snapped to the segment's start dot so the user isn't hunting.
 *   - A brief instruction card auto-dismisses after ~4.5 s (shown at most
 *     twice per stage).
 */
export default function Path2Lesson() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, updateProfile } = useAuth();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const lessonCursorBridge = useCursorPositionBridgeRef();
  const railDotRef = useRef(null);
  const buttonRefs = useRef({});
  // Raw user-path for the current segment, used for adherence scoring only.
  // It is no longer drawn on the canvas — the visible stroke is the rail.
  const userPathRef = useRef([]);
  const startTsRef = useRef(null);
  const jitterSamplesRef = useRef([]);
  const activationErrorsRef = useRef(0);
  const mouthEventsRef = useRef(0);
  const maxProjIdxRef = useRef(0);
  // Indices along the current segment's centerline where the user was off
  // the corridor — rendered as gradient wobble beads (green → red by drift).
  const wobbleIndicesRef = useRef([]);
  /** Per centerline vertex: last { dist, threshold } sampled while the tip was near that index. */
  const railVertexDistRef = useRef(null);
  /** Latest quality for “perfect” pulse on canvas */
  const latestQualityRef = useRef({
    dist: 0,
    threshold: 1,
    perfect: false,
    perfectStrength: 0,
    active: false,
  });
  const displayCursorRef = useRef({ x: 0, y: 0 });
  // Completed segment paths (in canvas coords) get redrawn on every frame.
  const completedSegmentsRef = useRef([]);
  // Per-segment metrics accumulated across the current attempt.
  const segmentResultsRef = useRef([]);
  const guideIdxRef = useRef(0);
  const lastAdherenceSampleRef = useRef({ x: null, y: null, ts: 0 });
  const debugSamplesRef = useRef([]);
  const segmentStartLockUntilRef = useRef(0);
  const lastHeadCanvasPosRef = useRef(null);
  const stallFramesRef = useRef(0);
  const reachedHalfwayRef = useRef(false);
  const manualMouthLatchRef = useRef(false);
  const lastManualMouthToggleRef = useRef(0);

  const stageFromUrl = Number(searchParams.get("stage"));
  const stageRaw = Number.isFinite(stageFromUrl) && stageFromUrl >= 3
    ? stageFromUrl
    : (profile?.currentStage ?? 3);
  const stageId = Math.max(3, Math.min(6, stageRaw));
  const stage = useMemo(() => getStage(stageId), [stageId]);
  // Optional ?variant= override so LessonSelect can launch a specific shape
  // (e.g. "square") instead of cycling through the stage's variants by
  // attempt number.  Any truthy variant for the stage is honoured.
  const forcedVariant = searchParams.get("variant") || null;
  const language = profile?.caregiverReported?.language ?? "en";
  const lowStim = Boolean(profile?.lowStimulation);
  const activationConfig = resolveActivationConfig(profile, "lessons");
  const activationMethod = activationConfig.activationMethod;

  const {
    cursorPosRef,
    updateCursorFromLandmarks,
    tiltStateRef,
    freezeRecalibrationRef,
  } = useCalibratedCursor(profile);
  /** Count of completed lesson attempts (session log). */
  const reinforcementCompletionsRef = useRef(0);
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

  const [phase, setPhase] = useState("demo");
  const [attempt, setAttempt] = useState(0);
  const [corridor, setCorridor] = useState(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [adherence, setAdherence] = useState(0);
  const [finishedPayload, setFinishedPayload] = useState(null);
  const [muted, setMuted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [masteryToast, setMasteryToast] = useState(null);
  const [instructionDismiss, setInstructionDismiss] = useState(0);
  const [scoreSprinklesOn, setScoreSprinklesOn] = useState(false);
  const [lessonPaused, setLessonPaused] = useState(false);
  const [caregiverControlsVisible, setCaregiverControlsVisible] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [countdownDeadlineMs, setCountdownDeadlineMs] = useState(null);
  const [countdownNowMs, setCountdownNowMs] = useState(0);
  const [masteryProgressVisual, setMasteryProgressVisual] = useState(0);
  const [debugScoring] = useState(true);
  const [, setDebugFrame] = useState({
    dist: 0,
    threshold: 0,
    inCorridor: true,
    sampled: false,
    projIdx: 0,
    railIdx: 0,
    tracePoints: 0,
  });

  const adaptedStage = useMemo(() => {
    const log = typeof window !== "undefined" ? getTrialLog() : [];
    const stageTrials = filterTrials(log, {
      userId: user?.uid ?? "local",
      mode: 2,
      stage: stage.stage,
    });
    return getAdaptedStage(stage, stageTrials);
  }, [stage, attempt, user?.uid]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const lessonPausedRef = useRef(false);
  lessonPausedRef.current = lessonPaused;
  const pauseAccumMsRef = useRef(0);
  const pauseLastTsRef = useRef(null);
  const corridorRef = useRef(null);
  corridorRef.current = corridor;
  const segmentIndexRef = useRef(0);
  segmentIndexRef.current = segmentIndex;
  const isDrawingRef = useRef(false);
  isDrawingRef.current = isDrawing;

  /** The list of segments for the current corridor, or a synthetic single
   * segment wrapping the whole centerline if none were provided. */
  const segmentsFor = useCallback((c) => {
    if (!c?.centerline?.length) return [];
    if (Array.isArray(c.segments) && c.segments.length > 0) return c.segments;
    return [
      {
        label: "line",
        start: c.start,
        end: c.end,
        centerline: c.centerline,
        closed: c.closed,
      },
    ];
  }, []);

  const currentSegment = useMemo(() => {
    if (!corridor) return null;
    const segs = segmentsFor(corridor);
    return segs[segmentIndex] ?? null;
  }, [corridor, segmentIndex, segmentsFor]);

  const currentSegmentRef = useRef(null);
  currentSegmentRef.current = currentSegment;
  const canceledStrokeRef = useRef(null);
  const caregiverHideTimerRef = useRef(null);
  const caregiverMouseRef = useRef({ x: null, y: null });

  const revealCaregiverControls = useCallback(() => {
    setCaregiverControlsVisible(true);
    if (caregiverHideTimerRef.current) clearTimeout(caregiverHideTimerRef.current);
    caregiverHideTimerRef.current = setTimeout(() => {
      setCaregiverControlsVisible(false);
    }, CAREGIVER_CONTROLS_HIDE_MS);
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
      if (moved >= CAREGIVER_MOUSE_REVEAL_DELTA) {
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

  // New corridor on stage / attempt change — reset everything.
  useEffect(() => {
    const c = getStageLessonPath(adaptedStage, attempt, CANVAS_WIDTH, CANVAS_HEIGHT, {
      variant: forcedVariant,
    });
    setCorridor(c);
    setSegmentIndex(0);
    userPathRef.current = [];
    wobbleIndicesRef.current = [];
    completedSegmentsRef.current = [];
    segmentResultsRef.current = [];
    lastAdherenceSampleRef.current = { x: null, y: null, ts: 0 };
    debugSamplesRef.current = [];
    stallFramesRef.current = 0;
    lastHeadCanvasPosRef.current = null;
    setAdherence(0);
    setFinishedPayload(null);
    setSaved(false);
    activationErrorsRef.current = 0;
    mouthEventsRef.current = 0;
    jitterSamplesRef.current = [];
    maxProjIdxRef.current = 0;
    guideIdxRef.current = 0;
    startTsRef.current = null;
    reachedHalfwayRef.current = false;
    railVertexDistRef.current = null;
    latestQualityRef.current = { dist: 0, threshold: 1, perfect: false, perfectStrength: 0, active: false };
  }, [adaptedStage, attempt, forcedVariant]);

  // canvas-internal (CANVAS_WIDTH x CANVAS_HEIGHT) → on-screen pixels.
  const canvasToScreen = useCallback((cx, cy) => {
    const el = canvasRef.current;
    if (!el) return { x: cx, y: cy };
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + (cx / CANVAS_WIDTH) * rect.width,
      y: rect.top + (cy / CANVAS_HEIGHT) * rect.height,
    };
  }, []);

  const { completeSegment } =
    usePath2ScoringProgression({
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
    });

  const {
    snapCursorToCanvasPoint,
    getLessonCageBounds,
    cancelCurrentStroke,
    startDrawingSegment,
    beginTrial,
  } = usePath2InputCageController({
    phaseRef,
    isDrawingRef,
    currentSegmentRef,
    corridorRef,
    segmentsFor,
    cursorPosRef,
    displayCursorRef,
    canvasToScreen,
    freezeRecalibrationRef,
    setIsDrawing,
    setInstructionDismiss,
    userPathRef,
    wobbleIndicesRef,
    maxProjIdxRef,
    guideIdxRef,
    startTsRef,
    lastAdherenceSampleRef,
    debugSamplesRef,
    canceledStrokeRef,
    segmentStartLockUntilRef,
    lastHeadCanvasPosRef,
    stallFramesRef,
    reachedHalfwayRef,
    railVertexDistRef,
    lessonCagePadding: LESSON_CAGE_PADDING,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    visualCorridorScale: VISUAL_CORRIDOR_SCALE,
    startLockMs: START_LOCK_MS,
  });

  const completeSegmentAndAdvance = useCallback(() => {
    const nextIndex = completeSegment();
    if (typeof nextIndex !== "number") return;
    try {
      playSuccessBeep();
    } catch {
      /* ignore */
    }
    setSegmentIndex(nextIndex);
    const segs = segmentsFor(corridorRef.current);
    const nextSeg = segs[nextIndex];
    if (nextSeg?.start) {
      snapCursorToCanvasPoint(nextSeg.start.x, nextSeg.start.y);
    }
  }, [completeSegment, segmentsFor, corridorRef, snapCursorToCanvasPoint]);

  useEffect(() => {
    if (phase !== "trial" || !isDrawing || !currentSegment?.centerline?.length) {
      return undefined;
    }
    const id = setInterval(() => {
      const maxIdx = currentSegment.centerline.length - 1;
      const next = Math.min(maxIdx, guideIdxRef.current + GUIDE_PROGRESS_PER_MS * 33);
      guideIdxRef.current = next;
    }, 33);
    return () => clearInterval(id);
  }, [phase, isDrawing, currentSegment]);

  const { processLandmarks } = useGestureControl({
    cursorPosRef,
    activationMethod,
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

  const onFaceResults = useCallback(
    (results) => {
      const landmarks = results?.multiFaceLandmarks?.[0];
      if (!landmarks) return;
      updateCursorFromLandmarks(landmarks);
      processLandmarks(landmarks, isDrawingRef.current);

      if (tiltStateRef.current?.lastJitter != null) {
        jitterSamplesRef.current.push(tiltStateRef.current.lastJitter);
        if (jitterSamplesRef.current.length > 400) jitterSamplesRef.current.shift();
      }

      const upperM = landmarks[13];
      const lowerM = landmarks[14];
      const mouthHHold = Math.abs(upperM.y - lowerM.y);
      const mouthOpenHold = mouthHHold > activationConfig.mouthOpenThreshold;
      const pauseClk = performance.now();
      // Manual in-lesson toggle: mouth-open starts/stops stroke reliably.
      if (phaseRef.current === "trial" && !lessonPausedRef.current) {
        if (mouthOpenHold && !manualMouthLatchRef.current) {
          const now = performance.now();
          if (now - lastManualMouthToggleRef.current > 550) {
            manualMouthLatchRef.current = true;
            lastManualMouthToggleRef.current = now;
            if (isDrawingRef.current) {
              cancelCurrentStroke();
            } else {
              startDrawingSegment();
            }
          }
        } else if (!mouthOpenHold) {
          manualMouthLatchRef.current = false;
        }
      } else {
        manualMouthLatchRef.current = false;
      }
      const pauseStep =
        pauseLastTsRef.current != null
          ? Math.min(120, Math.max(8, pauseClk - pauseLastTsRef.current))
          : 33;
      pauseLastTsRef.current = pauseClk;
      if (!lessonPausedRef.current && phaseRef.current === "trial") {
        if (mouthOpenHold) {
          const rawHold = cursorPosRef.current;
          const cvHold = canvasRef.current?.getBoundingClientRect();
          const outsideCv =
            cvHold &&
            !lessonPointInsideCanvas(rawHold.x, rawHold.y, {
              left: cvHold.left,
              top: cvHold.top,
              right: cvHold.right,
              bottom: cvHold.bottom,
            });
          if (outsideCv) {
            pauseAccumMsRef.current += pauseStep;
            if (pauseAccumMsRef.current >= LESSON_PAUSE_HOLD_MS) {
              setLessonPaused(true);
              pauseAccumMsRef.current = 0;
            }
          } else pauseAccumMsRef.current = 0;
        } else pauseAccumMsRef.current = 0;
      } else {
        pauseAccumMsRef.current = 0;
      }

      if (lessonPausedRef.current) {
        displayCursorRef.current.x = cursorPosRef.current.x;
        displayCursorRef.current.y = cursorPosRef.current.y;
        drawScene();
        return;
      }

      // Cursor-on-rail model: during a trial the visible cursor is ALWAYS
      // glued to the current rail tip.  Before drawing begins the rail tip
      // sits at the segment's start dot (index 0), so the cursor visually
      // "waits" there — no hunting, no jump at mouth-open.  While drawing
      // the rail advances based on the user's head-projected position and
      // the cursor tracks with it.  Outside a trial (demo / reward) we fall
      // back to raw head tracking so the user can see the camera responding.
      const seg = currentSegmentRef.current;
      const inTrial = phaseRef.current === "trial";

      if (!inTrial || !seg?.centerline?.length) {
        displayCursorRef.current.x = cursorPosRef.current.x;
        displayCursorRef.current.y = cursorPosRef.current.y;
      } else if (!isDrawingRef.current) {
        // Free cursor between strokes so caregiver/user can navigate controls.
        displayCursorRef.current.x = cursorPosRef.current.x;
        displayCursorRef.current.y = cursorPosRef.current.y;
      }

      if (
        inTrial &&
        isDrawingRef.current &&
        canvasRef.current &&
        seg?.centerline?.length
      ) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cageNow = getLessonCageBounds();
        const sxMarginLeft = (cageNow.left / CANVAS_WIDTH) * rect.width;
        const sxMarginRight = (cageNow.right / CANVAS_WIDTH) * rect.width;
        const syMarginTop = (cageNow.top / CANVAS_HEIGHT) * rect.height;
        const syMarginBottom = (cageNow.bottom / CANVAS_HEIGHT) * rect.height;
        const clampedScreenX = Math.max(
          rect.left + sxMarginLeft,
          Math.min(rect.left + sxMarginRight, cursorPosRef.current.x),
        );
        const clampedScreenY = Math.max(
          rect.top + syMarginTop,
          Math.min(rect.top + syMarginBottom, cursorPosRef.current.y),
        );
        cursorPosRef.current.x = clampedScreenX;
        cursorPosRef.current.y = clampedScreenY;
        const { x, y } = getCanvasCoordinates(
          canvasRef.current,
          clampedScreenX,
          clampedScreenY,
        );
        const cage = getLessonCageBounds();
        const clampedX = Math.max(cage.left, Math.min(cage.right, x));
        const clampedY = Math.max(cage.top, Math.min(cage.bottom, y));
        const c = corridorRef.current;
        const lockActive = performance.now() < segmentStartLockUntilRef.current;
        if (lockActive && seg?.start) {
          const startScreen = canvasToScreen(seg.start.x, seg.start.y);
          displayCursorRef.current.x = startScreen.x;
          displayCursorRef.current.y = startScreen.y;
          maxProjIdxRef.current = 0;
          drawScene();
          return;
        }

        const near = getNearestPointOnPath({ x: clampedX, y: clampedY }, seg.centerline);
        const Lpath = seg.centerline.length;
        const pathFloat = Math.max(
          0,
          Math.min(Lpath - 1, near.pathIndexFloat ?? (near.pathIndex ?? 0)),
        );
        const prevIdx = maxProjIdxRef.current ?? 0;
        const along = pathFloat - prevIdx;
        const dist = distanceToPath({ x: clampedX, y: clampedY }, seg.centerline);
        const threshold = effectiveScoringWidth(c.width) / 2;
        const inCorridor = dist <= threshold;
        const hardOffCorridor = dist > threshold * OFF_CORRIDOR_HARD_MULTIPLIER;
        const softOffCorridor = dist > threshold * OFF_CORRIDOR_SOFT_MULTIPLIER;
        const lastHead = lastHeadCanvasPosRef.current;
        const headMove = lastHead
          ? Math.hypot(clampedX - lastHead.x, clampedY - lastHead.y)
          : 0;
        lastHeadCanvasPosRef.current = { x: clampedX, y: clampedY };
        if (Math.abs(along) < 0.1 && headMove > 2.5 && !softOffCorridor) {
          stallFramesRef.current += 1;
        } else {
          stallFramesRef.current = 0;
        }
        const cap = MAX_RAIL_SYNC_PER_FRAME;
        let nextIdx = prevIdx + Math.max(-cap, Math.min(cap, along));
        if (stallFramesRef.current >= 5) {
          const nudge = Math.min(0.5, headMove / 10);
          nextIdx = Math.min(Lpath - 1, nextIdx + nudge);
        }
        // Stroke cannot stay ahead of the user’s true position on the line.
        nextIdx = Math.min(nextIdx, pathFloat + RAIL_AHEAD_SLACK);
        if (hardOffCorridor) {
          nextIdx = prevIdx;
        } else if (softOffCorridor) {
          nextIdx = Math.min(nextIdx, prevIdx + 0.15);
        }
        if (stage.stage >= 4) {
          const pacedLimit = Math.min(
            seg.centerline.length - 1,
            guideIdxRef.current + GUIDE_AHEAD_BUFFER,
          );
          nextIdx = Math.min(nextIdx, pacedLimit);
        }
        maxProjIdxRef.current = nextIdx;

        const Lv = seg.centerline.length;
        if (!railVertexDistRef.current || railVertexDistRef.current.length !== Lv) {
          railVertexDistRef.current = new Array(Lv).fill(null);
        }
        const riQ = Math.min(Lv - 1, Math.max(0, Math.floor(nextIdx)));
        railVertexDistRef.current[riQ] = { dist, threshold };
        const normQ = dist / Math.max(0.5, threshold);
        const perfectStrength =
          normQ < 0.34 ? Math.max(0, Math.min(1, 1 - normQ / 0.34)) : 0;
        latestQualityRef.current = {
          dist,
          threshold,
          perfect: perfectStrength > 0.1,
          perfectStrength,
          active: true,
        };

        const railIdx = Math.min(seg.centerline.length - 1, Math.floor(nextIdx));
        const railFrac = nextIdx - railIdx;
        const a = seg.centerline[railIdx];
        const b = seg.centerline[Math.min(seg.centerline.length - 1, railIdx + 1)];
        const railX = a.x + railFrac * (b.x - a.x);
        const railY = a.y + railFrac * (b.y - a.y);

        // Record a wobble bead only periodically and only when clearly off
        // the corridor.  This gives the user a readable "you wobbled here"
        // trail without cluttering the trace.
        if (!inCorridor && userPathRef.current.length % 6 === 0) {
          wobbleIndicesRef.current.push({
            idx: railIdx,
            frac: railFrac,
            intensity: Math.min(1, (dist - threshold) / (threshold * 1.5)),
          });
          if (wobbleIndicesRef.current.length > 80) {
            wobbleIndicesRef.current.shift();
          }
        }

        // Raw user-path point (for adherence scoring only, not drawn).
        // Sample only on meaningful movement/progress so pausing mid-stroke
        // does not continuously drag accuracy downward over time.
        const now = performance.now();
        const last = lastAdherenceSampleRef.current;
        const movedEnough =
          last.x == null ||
          Math.hypot(clampedX - last.x, clampedY - last.y) >= ADHERENCE_MIN_SAMPLE_DIST;
        const elapsedEnough = now - (last.ts ?? 0) >= ADHERENCE_MIN_SAMPLE_MS;
        const progressedEnough = along > 0.35;
        let sampled = false;
        if (movedEnough || (elapsedEnough && progressedEnough)) {
          userPathRef.current.push({ x: clampedX, y: clampedY });
          lastAdherenceSampleRef.current = { x: clampedX, y: clampedY, ts: now };
          sampled = true;
          if (debugScoring) {
            debugSamplesRef.current.push({
              x: clampedX,
              y: clampedY,
              inCorridor,
              dist,
              threshold,
              nearX: near?.point?.x ?? clampedX,
              nearY: near?.point?.y ?? clampedY,
            });
            if (debugSamplesRef.current.length > 120) debugSamplesRef.current.shift();
          }
        }
        if (debugScoring) {
          setDebugFrame({
            dist: Number(dist.toFixed(1)),
            threshold: Number(threshold.toFixed(1)),
            inCorridor,
            sampled,
            projIdx: Number(pathFloat.toFixed(2)),
            railIdx: Number(nextIdx.toFixed(1)),
            tracePoints: userPathRef.current.length,
          });
        }

        // Glue the visible cursor to the rail tip so the trace reads as one
        // cohesive object.  If the user drifts off-corridor the ACCURACY
        // score drops and gradient wobble beads appear on the rail, but the
        // cursor never "floats" away from the line.
        const screenTip = canvasToScreen(railX, railY);
        displayCursorRef.current.x = screenTip.x;
        displayCursorRef.current.y = screenTip.y;

        // Live adherence readout.  Recompute sparsely to stay cheap.
        const segs = segmentsFor(c);
        if (userPathRef.current.length % 6 === 0 || userPathRef.current.length <= 2) {
          const normalized = normalizePathToSegmentStart(userPathRef.current, seg);
          const current = calculateAdherence(normalized, {
            centerline: seg.centerline,
            width: effectiveScoringWidth(c.width),
          });
          const prior = segmentResultsRef.current;
          if (prior.length) {
            const priorPoints = prior.reduce((s, r) => s + r.points, 0);
            const priorAdh = prior.reduce((s, r) => s + r.adherence * r.points, 0);
            const curPts = userPathRef.current.length;
            const combined =
              (priorAdh + current * curPts) / Math.max(1, priorPoints + curPts);
            setAdherence(Math.round(combined));
          } else {
            setAdherence(current);
          }
        }

        // Auto-finish this segment once the rail tip is far enough along.
        const centerLen = seg.centerline.length;
        const progress = centerLen > 1 ? nextIdx / (centerLen - 1) : 0;
        const isOnlySegment = segs.length === 1;
        const closedBigShape = isOnlySegment && c.closed;
        const halfwayIdx = centerLen > 1 ? (centerLen - 1) * 0.5 : 0;
        if (closedBigShape && nextIdx >= halfwayIdx) {
          reachedHalfwayRef.current = true;
        }
        if (!closedBigShape && progress >= AUTO_FINISH_PROGRESS && !hardOffCorridor) {
          isDrawingRef.current = false;
          if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
          setIsDrawing(false);
          completeSegmentAndAdvance();
        } else if (closedBigShape && progress >= 0.8 && userPathRef.current.length > 40) {
          const last = userPathRef.current[userPathRef.current.length - 1];
          const back = Math.hypot(last.x - seg.start.x, last.y - seg.start.y);
          if (back < 80 && !hardOffCorridor && reachedHalfwayRef.current) {
            isDrawingRef.current = false;
            if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
            setIsDrawing(false);
            completeSegmentAndAdvance();
          }
        }
      } else {
        latestQualityRef.current = {
          dist: 0,
          threshold: 1,
          perfect: false,
          perfectStrength: 0,
          active: false,
        };
      }

      drawScene();
    },
    [
      updateCursorFromLandmarks,
      processLandmarks,
      cursorPosRef,
      tiltStateRef,
      completeSegment,
      canvasToScreen,
      segmentsFor,
      freezeRecalibrationRef,
      activationConfig,
      cancelCurrentStroke,
      startDrawingSegment,
      getLessonCageBounds,
    ],
  );

  const { startFaceMesh } = useFaceMesh({ videoRef, onResults: onFaceResults });

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
    if (phase === "trial") sayPhrase("openMouth", language);
    return () => stopSpeech();
  }, [phase, language, muted]);

  /** Paint the whole scene: background, ghost road, completed segments (tier
   * colours), active segment, dotted preview, wobble + debug dots, markers,
   * decorations. Reward phase: tier map. */
  function drawScene() {
    const canvas = canvasRef.current;
    const c = corridorRef.current;
    if (!canvas || !c?.centerline?.length) return;
    if (phaseRef.current === "demo") return;
    const ctx = canvas.getContext("2d");
    const segs = segmentsFor(c);

    if (phaseRef.current === "reward") {
      path2FillBackgroundAndRoad(ctx, canvas, c, segs);
      for (const done of completedSegmentsRef.current) {
        if (!done?.centerline?.length) continue;
        drawCenterlineByTiers(ctx, done.centerline, done.vertexTiers, TRACE_WIDTH);
      }
      path2DrawDecorations(ctx, c);
      return;
    }

    path2FillBackgroundAndRoad(ctx, canvas, c, segs);
    const segIdx = segmentIndexRef.current;
    const activeSeg = segs[segIdx] ?? null;

    for (const done of completedSegmentsRef.current) {
      if (!done?.centerline?.length) continue;
      drawCenterlineByTiers(ctx, done.centerline, done.vertexTiers, TRACE_WIDTH);
    }

    if (activeSeg?.centerline?.length) {
      // Remaining portion of the active segment — dashed thin line so the
      // user knows where the stroke is heading.
      const nextIdx = maxProjIdxRef.current ?? 0;
      const railIdx = Math.min(
        activeSeg.centerline.length - 1,
        Math.floor(nextIdx),
      );
      ctx.strokeStyle = PREVIEW_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      const startPoint = activeSeg.centerline[railIdx] ?? activeSeg.centerline[0];
      ctx.moveTo(startPoint.x, startPoint.y);
      for (let i = railIdx + 1; i < activeSeg.centerline.length; i++) {
        ctx.lineTo(activeSeg.centerline[i].x, activeSeg.centerline[i].y);
      }

      // If the user cancelled a stroke, briefly fade the cancelled partial trace.
      if (canceledStrokeRef.current?.centerline?.length) {
        const age = performance.now() - (canceledStrokeRef.current.ts ?? 0);
        if (age < CANCEL_TRACE_FADE_MS) {
          const alpha = 1 - age / CANCEL_TRACE_FADE_MS;
          const cl = canceledStrokeRef.current.centerline;
          const endIdx = Math.min(cl.length - 1, Math.floor(canceledStrokeRef.current.upto ?? 0));
          if (endIdx > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.65));
            ctx.lineWidth = TRACE_WIDTH;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = UI_TOKENS.lesson.neutralMarker;
            ctx.beginPath();
            ctx.moveTo(cl[0].x, cl[0].y);
            for (let i = 1; i <= endIdx; i++) ctx.lineTo(cl[i].x, cl[i].y);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          canceledStrokeRef.current = null;
        }
      }

      // During active drawing, show the interaction cage boundary.
      if (isDrawingRef.current) {
        const cage = getLessonCageBounds();
        ctx.save();
        ctx.strokeStyle = "rgba(99,102,241,0.28)";
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.strokeRect(
          cage.left,
          cage.top,
          Math.max(1, cage.right - cage.left),
          Math.max(1, cage.bottom - cage.top),
        );
        ctx.restore();
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Main trace: distance-coloured (green → red), not flat indigo.
      if (nextIdx > 0 && (isDrawingRef.current || phaseRef.current === "trial")) {
        const cl = activeSeg.centerline;
        const Lc = cl.length;
        const thD = effectiveScoringWidth(corridorRef.current?.width ?? 24) / 2;
        const vq = buildVertexQualityFills(
          railVertexDistRef.current,
          thD,
          Lc,
        );
        const railFrac = nextIdx - railIdx;
        const tipX =
          railIdx + 1 < Lc
            ? cl[railIdx].x + railFrac * (cl[railIdx + 1].x - cl[railIdx].x)
            : cl[railIdx].x;
        const tipY =
          railIdx + 1 < Lc
            ? cl[railIdx].y + railFrac * (cl[railIdx + 1].y - cl[railIdx].y)
            : cl[railIdx].y;
        const lastFull = Math.max(-1, Math.min(railIdx - 1, Lc - 2));
        ctx.lineWidth = TRACE_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 0; i <= lastFull; i++) {
          const p0 = cl[i];
          const p1 = cl[i + 1];
          const a0 = vq[i] ?? { dist: 0, threshold: thD };
          const a1 = vq[i + 1] ?? a0;
          const t0 = qualityTierFromDistance(a0.dist, a0.threshold);
          const t1 = qualityTierFromDistance(a1.dist, a1.threshold);
          const t = Math.max(t0, t1);
          ctx.strokeStyle = STROKE_QUALITY_HEX[t];
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        if (railIdx < Lc - 1) {
          const aR = vq[railIdx] ?? { dist: 0, threshold: thD };
          const aN = vq[railIdx + 1] ?? aR;
          const tR = qualityTierFromDistance(aR.dist, aR.threshold);
          const tN = qualityTierFromDistance(aN.dist, aN.threshold);
          const t = Math.max(tR, tN);
          const aTip = cl[railIdx];
          ctx.strokeStyle = STROKE_QUALITY_HEX[t];
          ctx.beginPath();
          ctx.moveTo(aTip.x, aTip.y);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
        }

        // “On track” — bright pulsing halos (very visible) at the tip.
        if (
          isDrawingRef.current &&
          latestQualityRef.current.active &&
          latestQualityRef.current.perfect
        ) {
          const s = latestQualityRef.current.perfectStrength ?? 0.5;
          const aBoost = 0.55 + 0.45 * s;
          const gBoost = 1 + 0.35 * s;
          const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.01);
          const rOuter = (TRACE_WIDTH * 0.85 + 12 + 10 * pulse) * (0.92 + 0.12 * s);
          const rMid = rOuter * 0.68;
          const rCore = rOuter * 0.42;
          ctx.save();
          ctx.lineCap = "round";
          // Outer white glow
          ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
          ctx.shadowBlur = 20 * gBoost;
          ctx.beginPath();
          ctx.arc(tipX, tipY, rOuter, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(0.75 + 0.2 * pulse) * aBoost})`;
          ctx.lineWidth = 4.5 + 1.2 * s;
          ctx.stroke();
          // Gold ring
          ctx.shadowColor = "rgba(250, 204, 21, 0.85)";
          ctx.shadowBlur = 16 * gBoost;
          ctx.beginPath();
          ctx.arc(tipX, tipY, rMid, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(253, 224, 71, ${(0.88 + 0.1 * pulse) * aBoost})`;
          ctx.lineWidth = 3.5 + s;
          ctx.stroke();
          // Inner bright “hot” core
          ctx.shadowBlur = 8 * gBoost;
          ctx.beginPath();
          ctx.arc(tipX, tipY, rCore, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 + 0.1 * s})`;
          ctx.lineWidth = 2.2 + 0.6 * s;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Wobble beads on the rail when off-corridor — amber → red by severity.
      if (wobbleIndicesRef.current.length) {
        for (const w of wobbleIndicesRef.current) {
          const a = activeSeg.centerline[w.idx] ?? activeSeg.centerline[0];
          const b =
            activeSeg.centerline[Math.min(activeSeg.centerline.length - 1, w.idx + 1)] ??
            a;
          const bx = a.x + w.frac * (b.x - a.x);
          const by = a.y + w.frac * (b.y - a.y);
          const aFill = 0.22 + 0.4 * Math.min(1, w.intensity ?? 0);
          const col = wobbleBeadColor(w.intensity ?? 0, aFill);
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${col.alpha})`;
          ctx.fill();
        }
      }

      // Start dot (green) for the active segment; end dot (red) only if it's
      // not closed AND we're not mid-draw (once the user opens mouth we want
      // the trace tip to land on the end dot visually).
      ctx.beginPath();
      ctx.arc(activeSeg.start.x, activeSeg.start.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = UI_TOKENS.lesson.success;
      ctx.fill();
      if (!activeSeg.closed) {
        ctx.beginPath();
        ctx.arc(activeSeg.end.x, activeSeg.end.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = UI_TOKENS.lesson.danger;
        ctx.fill();
      } else if (activeSeg.centerline.length > 2) {
        // Closed shapes (circle/sun) have same start/end point; show an explicit
        // halfway checkpoint so users know where to head first.
        const midIdx = Math.floor((activeSeg.centerline.length - 1) * 0.5);
        const mid = activeSeg.centerline[midIdx];
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = reachedHalfwayRef.current ? UI_TOKENS.lesson.startSoft : UI_TOKENS.lesson.warning;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
      }

      if (stage.stage >= 4 && isDrawingRef.current) {
        const gIdx = Math.min(activeSeg.centerline.length - 1, Math.floor(guideIdxRef.current));
        const gFrac = guideIdxRef.current - gIdx;
        const a = activeSeg.centerline[gIdx];
        const b = activeSeg.centerline[Math.min(activeSeg.centerline.length - 1, gIdx + 1)];
        const gx = a.x + gFrac * (b.x - a.x);
        const gy = a.y + gFrac * (b.y - a.y);
        ctx.beginPath();
        ctx.arc(gx, gy, 16, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,0.22)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gx, gy, 8, 0, Math.PI * 2);
        ctx.fillStyle = UI_TOKENS.lesson.startSoft;
        ctx.fill();
      }

      if (debugSamplesRef.current.length) {
        const samples = debugSamplesRef.current.slice(-60);
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const age = (i + 1) / samples.length;
          // Clear feedback: small dots match tier colours on the main stroke.
          const baseAlpha = 0.2 + age * 0.38;
          const th = s.threshold ?? effectiveScoringWidth(corridorRef.current?.width ?? 24) / 2;
          const dist = s.dist ?? 0;
          const baseR = 2.2 + age * 1.4;
          const { style } = traceSampleStyleFromDistance(dist, th, baseAlpha);
          const dotR = baseR;

          ctx.beginPath();
          ctx.arc(s.x, s.y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${style.r},${style.g},${style.b},${style.alpha})`;
          ctx.fill();
        }
      }
    }

    path2DrawDecorations(ctx, c);
  }

  const recenter = useCallback(() => {
    if (typeof window === "undefined") return;
    cursorPosRef.current.x = window.innerWidth / 2;
    cursorPosRef.current.y = window.innerHeight / 2;
  }, [cursorPosRef]);

  const resumeLessonPause = useCallback(() => {
    setLessonPaused(false);
    pauseAccumMsRef.current = 0;
  }, []);

  // Spoken instruction + 3-2-1 countdown before trial begins.
  useEffect(() => {
    if (phase !== "demo") {
      setCountdown(null);
      setCountdownDeadlineMs(null);
      return undefined;
    }
    const spokenGuide =
      language === "ur"
        ? "سبز نقطے سے شروع کریں، نقطوں والی لکیر پر چلیں، اور شروع کرنے کے لیے منہ کھولیں۔"
        : "Start at the green dot, trace the dotted line, and open your mouth to begin.";
    if (!muted) speakInstruction(spokenGuide, { language });
    const deadline = Date.now() + DEMO_COUNTDOWN_MS;
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
        beginTrial(recenter, setPhase);
        return;
      }
      setCountdown(current);
      if (!muted) speakInstruction(String(current), { language });
    }, DEMO_COUNTDOWN_STEP_MS);
    return () => clearInterval(id);
  }, [phase, beginTrial, recenter, muted, language]);

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

  const finishNow = useCallback(() => {
    if (phaseRef.current !== "trial") return;
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
    setIsDrawing(false);
    completeSegmentAndAdvance();
  }, [completeSegmentAndAdvance, freezeRecalibrationRef]);

  async function saveToGallery() {
    const canvas = canvasRef.current;
    if (!canvas || !user?.uid || !finishedPayload) return;
    try {
      const thumbnail = canvas.toDataURL("image/png");
      await saveLessonResultCloud(user.uid, {
        title: `${stage.title} (${language === "ur" ? stage.titleUr ?? stage.title : stage.title})`,
        stage: stage.stage,
        score: finishedPayload.adherence,
        passed: finishedPayload.passed,
        thumbnail,
      });
      setSaved(true);
    } catch (e) {
      console.warn("saveToGallery failed", e);
    }
  }

  function nextAttempt() {
    setAttempt((a) => a + 1);
    setPhase("demo");
  }

  function handleExit() {
    stopSpeech();
    appendSessionLog({
      userId: user?.uid ?? "local",
      mode: 2,
      stage: stage.stage,
      durationMs: sessionTimer.elapsedMs,
      attempts: attempt,
      reinforcementsFired: reinforcementCompletionsRef.current,
      completion: "exit",
    });
    navigate("/lessons");
  }

  useEffect(() => {
    if (phase !== "reward" || !finishedPayload) {
      setScoreSprinklesOn(false);
      setMasteryProgressVisual(0);
      return;
    }
    setScoreSprinklesOn(true);
    playCheerSound();
    const masteryNow = finishedPayload.masteryProgress
      ? Math.max(
          0,
          Math.min(1, finishedPayload.masteryProgress.after / finishedPayload.masteryProgress.target),
        )
      : 0;
    const masteryBefore = finishedPayload.masteryProgress
      ? Math.max(0, Math.min(1, finishedPayload.masteryProgress.before / finishedPayload.masteryProgress.target))
      : 0;
    setMasteryProgressVisual(masteryBefore);
    const anim = setTimeout(() => setMasteryProgressVisual(masteryNow), 70);
    const t = setTimeout(() => setScoreSprinklesOn(false), SCORE_REVEAL_MS);
    return () => {
      clearTimeout(anim);
      clearTimeout(t);
    };
  }, [phase, finishedPayload, attempt]);

  useEffect(() => {
    let raf;
    const smoothed = { x: displayCursorRef.current.x, y: displayCursorRef.current.y };
    const loop = () => {
      const target = displayCursorRef.current;
      smoothed.x += (target.x - smoothed.x) * 0.35;
      smoothed.y += (target.y - smoothed.y) * 0.35;
      const br = lessonCursorBridge?.current;
      if (br) {
        const raw = cursorPosRef.current;
        br.raw.x = raw.x;
        br.raw.y = raw.y;
        if (canvasRef.current) {
          const r = canvasRef.current.getBoundingClientRect();
          br.canvasViewport = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        }
        br.lessonPaused = lessonPaused;
        br.showUniversalCursor = true;
      }
      if (railDotRef.current) {
        railDotRef.current.style.left = `${smoothed.x}px`;
        railDotRef.current.style.top = `${smoothed.y}px`;
        const raw = cursorPosRef.current;
        const vp = br?.canvasViewport;
        const inCv = lessonPointInsideCanvas(raw.x, raw.y, vp);
        const drift = Math.hypot(smoothed.x - raw.x, smoothed.y - raw.y);
        const showRailMark =
          !lessonPaused &&
          phaseRef.current === "trial" &&
          inCv &&
          (drift > 14 || isDrawingRef.current);
        railDotRef.current.style.visibility = showRailMark ? "visible" : "hidden";
      }
      raf = requestAnimationFrame(loop);
    };
    if (typeof window !== "undefined") {
      displayCursorRef.current.x = window.innerWidth / 2;
      displayCursorRef.current.y = window.innerHeight / 2;
      smoothed.x = displayCursorRef.current.x;
      smoothed.y = displayCursorRef.current.y;
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [lessonPaused]);

  if (sessionTimer.capped) {
    return <BreakPrompt kind="cap" language={language} onExit={handleExit} />;
  }

  const activeVariantKey = getEffectiveLessonVariant(stage, attempt, forcedVariant);
  const variantPretty = activeVariantKey
    ? lessonVariantDisplayName(language, activeVariantKey)
    : "";
  const lessonIdx = lessonIndexWithinStage(stage, activeVariantKey);
  const lessonTotal = lessonCountInStage(stage);
  const title = language === "ur" ? stage.titleUr ?? stage.title : stage.title;
  const segmentsArr = segmentsFor(corridor);
  const totalSegments = segmentsArr.length;
  const showSegmentCounter = totalSegments > 1;

  // Live mood classification drives the adherence pill colour and the
  // canvas border glow.  Framework §7.2 — we already log adherence; here
  // we also surface it visually as encouragement while the user draws.
  const mood =
      phase === "trial" && adherence >= 65
      ? "good"
      : phase === "trial" && adherence > 0 && adherence < 35
      ? "off"
      : "neutral";
  const moodPillClass =
    mood === "good"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : mood === "off"
      ? "bg-rose-100 text-rose-700 border-rose-300"
      : "easeL-accent-bg easeL-accent-text-strong easeL-accent-border border";
  const canvasMoodClass =
    mood === "good"
      ? "ring-4 ring-emerald-300/60"
      : mood === "off"
      ? "ring-4 ring-rose-300/60"
      : "ring-0";

  // Progress across the whole attempt (all segments).  `maxProjIdxRef` is
  // per-segment, so we weight each finished segment as 1.0 and blend the
  // current segment's rail progress in.  This feeds the big progress bar
  // under the canvas.
  const attemptProgress = (() => {
    if (!corridor || !segmentsArr.length) return 0;
    const doneFrac = Math.min(1, (completedSegmentsRef.current?.length ?? 0) / totalSegments);
    const current = segmentsArr[segmentIndex]?.centerline?.length
      ? Math.min(1, (maxProjIdxRef.current ?? 0) / (segmentsArr[segmentIndex].centerline.length - 1))
      : 0;
    return Math.min(1, doneFrac + current / totalSegments);
  })();
  const progressPct = Math.round(attemptProgress * 100);
  const progressBarColor =
    mood === "good"
      ? "bg-emerald-500"
      : mood === "off"
      ? "bg-rose-400"
      : "bg-[var(--easeL-primary)]";
  const gaugeRadius = 64;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const scoreGaugeProgress = finishedPayload ? Math.max(0, Math.min(1, finishedPayload.adherence / 100)) : 0;
  const passGaugeProgress = finishedPayload
    ? Math.max(0, Math.min(1, (finishedPayload.requiredAdherence ?? 0) / 100))
    : 0;
  const passAngle = passGaugeProgress * Math.PI * 2 - Math.PI / 2;
  const passMarkerX = 80 + Math.cos(passAngle) * gaugeRadius;
  const passMarkerY = 80 + Math.sin(passAngle) * gaugeRadius;

  return (
    <div
      className="easeL-page-bg relative flex min-h-screen w-screen flex-col items-center overflow-hidden px-4 pb-4 pt-20"
    >
      <MasteryToast message={masteryToast} language={language} />
      <LessonInstructionCard
        stage={stage.stage}
        mode={2}
        language={language}
        active={phase === "trial" && !isDrawing && segmentIndex === 0}
        dismissSignal={instructionDismiss}
      />

      <div className="z-20 mb-2 flex w-full max-w-[1200px] items-center justify-between gap-3">
        <div
          className="min-w-0 flex items-center gap-2 rounded-2xl border px-4 py-2"
          style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-subtle)" }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--easeL-text-muted)" }}>
            Level {stage.stage}
          </span>
          {lessonTotal > 1 && (
            <span className="text-xs font-semibold" style={{ color: "var(--easeL-text-muted)" }}>
              ·{" "}
              {language === "ur"
                ? `سبق ${lessonIdx} (${lessonTotal} میں سے)`
                : `Lesson ${lessonIdx} of ${lessonTotal}`}
            </span>
          )}
          <span className="truncate text-base font-bold" style={{ color: "var(--easeL-text)" }}>{title}</span>
          {activeVariantKey && (
            <span className="easeL-accent-bg easeL-accent-text-strong rounded-lg px-2.5 py-1 text-xs font-semibold">
              {variantPretty || activeVariantKey}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex min-h-[42px] items-center gap-2 px-3 py-1.5 rounded-xl border-2 shadow-sm transition-colors ${
            phase === "trial" ? moodPillClass : "bg-white/85 text-slate-400 border-slate-200"
          }`}
          >
            {mood === "good" && <CheckCircle2 className="w-4 h-4" />}
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
              {language === "ur" ? "ارادہ" : "Intent"}
            </span>
            <span className="text-lg font-extrabold tabular-nums">
              {phase === "trial" ? `${adherence}%` : "--"}
            </span>
          </div>

        <div
          className={`flex items-center gap-2 overflow-x-auto transition-opacity duration-300 ${
            caregiverControlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onMouseEnter={revealCaregiverControls}
        >
          <TroubleshootAssist />
          <button
            type="button"
            ref={(el) => {
              buttonRefs.current.recenter = el;
            }}
            onClick={recenter}
            className="easeL-btn-outline inline-flex min-h-10 items-center gap-1.5 px-3 text-sm font-semibold"
            title="Recenter cursor"
          >
            <RefreshCw className="w-4 h-4" />
            {language === "ur" ? "مرکز" : "Recenter"}
          </button>
          <button
            type="button"
            ref={(el) => {
              buttonRefs.current.mute = el;
            }}
            onClick={() => setMuted((m) => !m)}
            className="easeL-btn-outline inline-flex min-h-10 items-center gap-1.5 px-3 text-sm font-semibold"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {language === "ur" ? (muted ? "آواز بند" : "آواز") : muted ? "Muted" : "Sound"}
          </button>
          <button
            ref={(el) => {
              buttonRefs.current.exit = el;
            }}
            onClick={handleExit}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 px-4 text-sm font-bold transition hover:opacity-95"
            style={{
              background: "var(--easeL-bg-section-alt)",
              borderColor: "var(--easeL-border-strong)",
              color: "var(--easeL-text)",
            }}
          >
            <LogOut className="w-5 h-5" />
            {language === "ur" ? "ختم" : "Exit"}
          </button>
        </div>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mb-2 z-10">
        <div className="easeL-hud-bar flex items-center justify-between gap-3 rounded-xl px-4 py-2 shadow">
          <p className="text-sm font-semibold">
            {phase === "demo"
              ? language === "ur"
                ? "تیار ہو جائیں…"
                : "Get ready…"
              : phase === "trial"
              ? showSegmentCounter
                ? language === "ur"
                  ? `مرحلہ ${segmentIndex + 1}: سبز نقطے سے شروع کریں۔`
                  : `Step ${segmentIndex + 1}: start at the green dot.`
                : stage.stage >= 4
                ? language === "ur"
                  ? "سبز چمکتے نقطے کے پیچھے آہستہ چلیں۔"
                  : "Follow the glowing green guide slowly."
                : corridor?.closed
                ? language === "ur"
                  ? "پہلے نارنجی نقطے تک جائیں، پھر آغاز پر واپس آئیں۔"
                  : "Reach the orange midpoint first, then return to start."
                : language === "ur"
                ? "نقطوں والی لکیر پر چلیں۔"
                : "Trace the dotted line — start at the green dot."
              : language === "ur"
              ? "نتیجہ…"
              : "Here’s your result…"}
          </p>
          <span className="rounded-lg bg-black/20 px-2 py-1 text-xs font-medium text-white/95">
            {Math.floor(sessionTimer.elapsedMs / 60000)}:
            {String(Math.floor((sessionTimer.elapsedMs % 60000) / 1000)).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="relative z-10 w-full flex justify-center">
        <div
          className="relative w-full"
          style={{
            maxWidth: `min(1100px, calc((100vh - 300px) * ${CANVAS_WIDTH} / ${CANVAS_HEIGHT}))`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`rounded-3xl shadow-2xl border-2 border-slate-200/90 bg-white transition-[box-shadow] ${canvasMoodClass}`}
            style={{
              width: "100%",
              height: "auto",
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              verticalAlign: "top",
              display: "block",
            }}
          />
          {lessonPaused ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="lesson-paused-title"
              className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white/92 px-6 py-10 shadow-inner ring-2 ring-inset ring-slate-200/90 pointer-events-auto z-10"
            >
              <Pause className="mb-3 h-12 w-12 text-[var(--easeL-primary)]" aria-hidden />
              <p
                id="lesson-paused-title"
                className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2 text-center"
              >
                {language === "ur" ? "روک دیا" : "Paused"}
              </p>
              <p className="text-slate-600 mb-6 text-center text-sm sm:text-base max-w-xs">
                {language === "ur"
                  ? "اوپر بٹن تک رسائی؛ جاری رکھنے کے لیے کلک کریں۔"
                  : "Use the toolbar above when you're ready; tap Resume to continue tracing."}
              </p>
              <button
                type="button"
                ref={(el) => {
                  buttonRefs.current.resume = el;
                }}
                className="easeL-btn-solid px-8 py-3 rounded-2xl text-lg font-bold min-w-[200px]"
                onClick={resumeLessonPause}
              >
                {language === "ur" ? "دوبارہ شروع کریں" : "Resume lesson"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div
        ref={railDotRef}
        aria-hidden
        className="fixed pointer-events-none z-[850] rounded-full border-2 border-white/75 bg-white/35 shadow-md"
        style={{
          width: 12,
          height: 12,
          transform: "translate(-50%, -50%)",
          left: "50%",
          top: "40%",
          visibility: "hidden",
        }}
      />

      <div className="w-full max-w-[1200px] mt-2 px-2 z-20 min-h-[42px]">
        <div className={`${phase === "trial" ? "opacity-100" : "opacity-0"} transition-opacity`}>
          <div className="flex items-center justify-between mb-1 text-xs font-semibold text-slate-600">
            <span>
              {language === "ur" ? "ترقی" : "Progress"}
              {showSegmentCounter && (
                <span className="ml-2 text-slate-400 font-normal">
                  {language === "ur"
                    ? `مرحلہ ${segmentIndex + 1} / ${totalSegments}`
                    : `Step ${segmentIndex + 1} of ${totalSegments}`}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {phase === "trial" && isDrawing && (
                <button
                  type="button"
                  ref={(el) => {
                    buttonRefs.current.finish = el;
                  }}
                  onClick={finishNow}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {language === "ur" ? "مکمل" : "Finish"}
                </button>
              )}
              <span className="tabular-nums text-slate-500">{progressPct}%</span>
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
            <div
              className={`h-full ${progressBarColor} transition-[width,background-color] duration-200 rounded-full`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <GhostStrokePreview
        canvasRef={canvasRef}
        centerline={phase === "demo" ? corridor?.centerline : null}
        active={phase === "demo"}
        color={UI_TOKENS.lesson.ghost}
        durationMs={900}
        lineWidth={10}
        maxAlpha={0.4}
        drawBackdrop={(ctx) => {
          const canvas = canvasRef.current;
          const c = corridorRef.current;
          if (!canvas || !c?.centerline?.length) return;
          ctx.fillStyle = UI_TOKENS.lesson.canvasBg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const segs = segmentsFor(c);
          if (c.closed && segs.length === 1) {
            ctx.fillStyle = "rgba(99,102,241,0.06)";
            ctx.beginPath();
            ctx.moveTo(c.centerline[0].x, c.centerline[0].y);
            for (const p of c.centerline) ctx.lineTo(p.x, p.y);
            ctx.closePath();
            ctx.fill();
          }
          ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
          ctx.lineWidth = c.width;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.1;
          for (const s of segs) {
            if (!s.centerline?.length) continue;
            ctx.beginPath();
            ctx.moveTo(s.centerline[0].x, s.centerline[0].y);
            for (let i = 1; i < s.centerline.length; i++)
              ctx.lineTo(s.centerline[i].x, s.centerline[i].y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(segs[0].start.x, segs[0].start.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = UI_TOKENS.lesson.success;
          ctx.fill();
        }}
        onDone={() => {}}
      />

      {phase === "demo" && countdown != null && (
        <div className="fixed top-[230px] left-1/2 z-30 -translate-x-1/2 pointer-events-none">
          <div
            className="rounded-3xl border bg-white/95 px-5 py-4 shadow-2xl backdrop-blur-sm"
            style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 35%, transparent)" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="grid h-20 w-20 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--easeL-primary) ${Math.max(
                    0,
                    Math.min(1, (countdownDeadlineMs - countdownNowMs) / DEMO_COUNTDOWN_MS),
                  ) * 360}deg, rgba(148,163,184,0.25) 0deg)`,
                }}
              >
                <div className="grid h-16 w-16 place-items-center rounded-full bg-white">
                  <span className="easeL-accent-text-strong text-4xl font-extrabold tabular-nums">
                    {countdown}
                  </span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {language === "ur" ? "تیار ہو جائیں" : "Get ready"}
                </p>
                <p className="text-lg font-extrabold text-slate-800">
                  {language === "ur" ? "سبز نقطے سے شروع کریں" : "Start at the green dot"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "trial" && !isDrawing && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div
            className="rounded-2xl bg-white/95 px-6 py-3 font-semibold shadow-lg"
            style={{
              border: "2px solid color-mix(in srgb, var(--easeL-primary) 32%, transparent)",
              color: "var(--easeL-primary)",
            }}
          >
            {language === "ur"
              ? "شروع/ختم کرنے کیلئے منہ کھولیں"
              : "Open your mouth to start or stop drawing"}
          </div>
        </div>
      )}

      {phase === "reward" && finishedPayload && (
        <Path2RewardModal
          language={language}
          title={title}
          lessonTotal={lessonTotal}
          lessonIdx={lessonIdx}
          variantPretty={variantPretty}
          activeVariantKey={activeVariantKey}
          finishedPayload={finishedPayload}
          scoreSprinklesOn={scoreSprinklesOn}
          lowStim={lowStim}
          scoreRevealMs={SCORE_REVEAL_MS}
          gaugeRadius={gaugeRadius}
          gaugeCircumference={gaugeCircumference}
          scoreGaugeProgress={scoreGaugeProgress}
          passMarkerX={passMarkerX}
          passMarkerY={passMarkerY}
          stageUnlockAdherence={STAGE_UNLOCK_ADHERENCE}
          masteryProgressVisual={masteryProgressVisual}
          stage={stage}
          saved={saved}
          onSaveToGallery={saveToGallery}
          onNextAttempt={nextAttempt}
          onNavigateUnlock={() => {
            if (finishedPayload?.unlock) {
              navigate(`/lesson-path2?stage=${finishedPayload.unlock.stage}`);
            }
          }}
          onNavigateNextStage={() => {
            if (finishedPayload?.unlockQualified) {
              navigate(`/lesson-path2?stage=${stage.stage + 1}`);
            }
          }}
          onNavigateHome={() => {
            stopSpeech();
            navigate("/home");
            appendSessionLog({
              userId: user?.uid ?? "local",
              mode: 2,
              stage: stage.stage,
              durationMs: sessionTimer.elapsedMs,
              attempts: attempt,
              reinforcementsFired: reinforcementCompletionsRef.current,
              completion: "result_home",
            });
          }}
          onBackToLessons={handleExit}
        />
      )}

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
