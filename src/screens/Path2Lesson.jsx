import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Volume2,
  VolumeX,
  Save,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Trophy,
  Home,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useGestureControl } from "../hooks/useGestureControl";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useSessionTimer } from "../hooks/useSessionTimer";
import ScoreSprinkles from "../components/ScoreSprinkles";
import BreakPrompt from "../components/BreakPrompt";
import GhostStrokePreview from "../components/GhostStrokePreview";
import LessonInstructionCard from "../components/LessonInstructionCard";
import Cursor from "../components/Cursor";
import MasteryToast from "../components/MasteryToast";
import TroubleshootAssist from "../components/TroubleshootAssist";
import { getStage, variantForAttempt } from "../utils/lessonContent";
import { getStageLessonPath } from "../utils/lessonPath";
import { distanceToPath, getNearestPointOnPath } from "../utils/lessonPath";
import { calculateAdherence, computePathAccuracy } from "../utils/corridorGeometry";
import { getCanvasCoordinates } from "../utils/canvasUtils";
import { appendTrialLog, appendSessionLog, getTrialLog } from "../utils/persistence";
import { resolveActivationConfig } from "../utils/activationConfig";
import { sayPhrase, stopSpeech, playSuccessBeep, playCheerSound } from "../utils/screenerAudio";
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
/** Duration of score % animation, sprinkles, and cheer — kept in sync (ms). */
const SCORE_REVEAL_MS = 800;
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
// Default only for dashed preview; live/completed trace uses `STROKE_QUALITY_HEX` tiers.
const TRACE_COLOR = "#4338CA";
const TRACE_WIDTH = 10;
const VISUAL_CORRIDOR_SCALE = 0.78;

/** Six discrete quality bands (on-line → off-line). Must match `qualityTierFromDistance` bins. */
const STROKE_QUALITY_HEX = ["#22C55E", "#5EEAD4", "#A3E635", "#EAB308", "#F97316", "#DC2626"];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * 0 = best (on path), 5 = far off. 6 steps for simple, readable feedback.
 */
function qualityTierFromDistance(dist, th) {
  const ths = Math.max(0.5, th);
  const n = dist / ths;
  if (n <= 0.32) return 0;
  if (n <= 0.5) return 1;
  if (n <= 0.65) return 2;
  if (n <= 0.82) return 3;
  if (n <= 1) return 4;
  return 5;
}

function distToStrokeRgb(dist, th) {
  const tier = qualityTierFromDistance(dist, th);
  return hexToRgb(STROKE_QUALITY_HEX[tier]);
}

/**
 * One polyline as solid segments, worst tier of the two vertices wins per edge.
 */
function drawCenterlineByTiers(ctx, centerline, vertexTiers, lineWidth) {
  const L = centerline.length;
  if (L < 2) return;
  const def = 2;
  const tiers =
    Array.isArray(vertexTiers) && vertexTiers.length === L
      ? vertexTiers
      : Array(L).fill(def);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < L - 1; i++) {
    const t = Math.max(
      Math.min(5, Math.max(0, tiers[i] ?? def)),
      Math.min(5, Math.max(0, tiers[i + 1] ?? def)),
    );
    ctx.strokeStyle = STROKE_QUALITY_HEX[t];
    ctx.beginPath();
    ctx.moveTo(centerline[i].x, centerline[i].y);
    ctx.lineTo(centerline[i + 1].x, centerline[i + 1].y);
    ctx.stroke();
  }
}

function path2FillBackgroundAndRoad(ctx, canvas, c, segs) {
  ctx.fillStyle = "#FAFAFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (c.closed && segs.length === 1) {
    ctx.fillStyle = "rgba(99,102,241,0.06)";
    ctx.beginPath();
    ctx.moveTo(c.centerline[0].x, c.centerline[0].y);
    for (const p of c.centerline) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
  ctx.lineWidth = Math.max(18, c.width * VISUAL_CORRIDOR_SCALE);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.1;
  for (const s of segs) {
    if (!s.centerline?.length) continue;
    ctx.beginPath();
    ctx.moveTo(s.centerline[0].x, s.centerline[0].y);
    for (let i = 1; i < s.centerline.length; i++) {
      ctx.lineTo(s.centerline[i].x, s.centerline[i].y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function path2DrawDecorations(ctx, c) {
  if (c.decorations?.rays) {
    for (const r of c.decorations.rays) {
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(r.from.x, r.from.y);
      ctx.lineTo(r.to.x, r.to.y);
      ctx.stroke();
    }
  }
  if (c.decorations?.tail) {
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    const t0 = c.decorations.tail[0];
    ctx.moveTo(t0.x, t0.y);
    for (const p of c.decorations.tail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Dotted preview colour for the not-yet-drawn portion of the active segment.
const PREVIEW_COLOR = "rgba(100, 116, 139, 0.65)";
const GUIDE_PROGRESS_PER_MS = 0.035;
const GUIDE_AHEAD_BUFFER = 14;
// Do not penalize a child for simply pausing. We only sample for adherence
// when there is meaningful movement/progress, not every frame.
const ADHERENCE_MIN_SAMPLE_DIST = 4;
const ADHERENCE_MIN_SAMPLE_MS = 140;
const START_LOCK_MS = 420;
const OFF_CORRIDOR_HARD_MULTIPLIER = 1.15;
const OFF_CORRIDOR_SOFT_MULTIPLIER = 1.02;
const ACCEPTANCE_BUFFER_PX = 4;

function normalizePathToSegmentStart(path, seg) {
  if (!Array.isArray(path) || path.length === 0 || !seg?.start) return path;
  const first = path[0];
  const offsetX = seg.start.x - first.x;
  const offsetY = seg.start.y - first.y;
  return path.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
}

function effectiveScoringWidth(width) {
  return Math.max(10, width + ACCEPTANCE_BUFFER_PX * 2);
}

/**
 * Lerp two RGB objects (0..1 factor).
 */
function lerpRgb(a, b, t) {
  const u = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u),
  };
}

// Inner ~80% of the scoring half-width: mint → deep green (reinforcement), no warm hues.
const TRACE_BEST = { r: 167, g: 243, b: 208 }; // mint-200
const TRACE_GOOD = { r: 52, g: 211, b: 153 }; // emerald-400
const TRACE_EDGE = { r: 21, g: 128, b: 61 }; // green-800
// Last ~20% inside the band: full gradient deep green → amber → red (meets the edge smoothly).
const TRACE_WARN = { r: 245, g: 158, b: 11 };
const TRACE_ORANGE = { r: 234, g: 88, b: 12 }; // orange-600
const TRACE_BAD = { r: 220, g: 38, b: 38 };

/** Portion of [0, threshold] that stays "green only"; the rest ramps warm → red before the physical edge. */
const IN_BAND_GREEN_ONLY = 0.8;

/**
 * Inner green-only band: f 0 = on the line, 1 = at 80% of scoring width.
 * Deep green on the line → mint toward the warm zone (reversed from mint-on-line).
 */
function greenZoneStyle(fractInner, baseAlpha) {
  const f = Math.max(0, Math.min(1, fractInner));
  let rgb;
  if (f < 0.5) {
    rgb = lerpRgb(TRACE_EDGE, TRACE_GOOD, f * 2);
  } else {
    rgb = lerpRgb(TRACE_GOOD, TRACE_BEST, (f - 0.5) * 2);
  }
  const q = 1 - f;
  const alphaBoost = 0.1 * q * q;
  return { ...rgb, alpha: Math.min(1, baseAlpha + alphaBoost) };
}

/**
 * Last 20% inside the band: starts from mint (meets inner zone) → amber → red at edge.
 */
function inBandEdgeGradient(t) {
  const u = Math.max(0, Math.min(1, t));
  if (u < 0.34) return lerpRgb(TRACE_BEST, TRACE_WARN, u / 0.34);
  if (u < 0.67) return lerpRgb(TRACE_WARN, TRACE_ORANGE, (u - 0.34) / 0.33);
  return lerpRgb(TRACE_ORANGE, TRACE_BAD, (u - 0.67) / 0.33);
}

/**
 * `dist` = distance to path, `th` = scoring half-width. Discrete quality tiers (matches stroke).
 */
function traceSampleStyleFromDistance(dist, th, baseAlpha) {
  const ths = Math.max(th, 0.5);
  const norm = dist / ths; // 1 = at corridor edge, >1 = outside
  const tier = qualityTierFromDistance(dist, ths);
  const { r, g, b } = hexToRgb(STROKE_QUALITY_HEX[tier]);
  if (norm <= 1) {
    const fInner = norm <= IN_BAND_GREEN_ONLY ? 1 - norm / IN_BAND_GREEN_ONLY : 0;
    return {
      style: { r, g, b, alpha: baseAlpha },
      q: fInner, // 1 = on line, for gold glow
      inGreenOnlyZone: norm <= IN_BAND_GREEN_ONLY,
    };
  }
  const past = dist - ths;
  const falloff = ths * 2.2;
  const extraOp = 0.5 * (1 - Math.exp(-past / falloff));
  return {
    style: { r, g, b, alpha: Math.min(0.95, baseAlpha + extraOp) },
    q: 0,
    inGreenOnlyZone: false,
  };
}

function wobbleBeadColor(intensity, baseAlpha) {
  const t = Math.min(1, 0.2 + 0.8 * (intensity ?? 0));
  const rgb = lerpRgb(TRACE_WARN, TRACE_BAD, t);
  return { ...rgb, alpha: baseAlpha };
}

/** Per-vertex {dist, th} for stroke colouring; forward-fill from last sample. */
function buildVertexQualityFills(raw, thDef, L) {
  if (L < 2) return [];
  const f = new Array(L);
  f[0] = raw?.[0] ?? { dist: 0, threshold: thDef };
  for (let i = 1; i < L; i++) {
    f[i] = raw?.[i] ?? f[i - 1];
  }
  return f;
}

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
  const cursorElRef = useRef(null);
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
  /** Latest quality for HTML cursor colour + “perfect” pulse on canvas. */
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
  const [masteryHint, setMasteryHint] = useState("");
  const [attemptFeedback, setAttemptFeedback] = useState("");
  const [scoreSprinklesOn, setScoreSprinklesOn] = useState(false);
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

  /** Snap both the tracking cursor and the display cursor to a canvas point.
   * Call when starting or advancing to a new segment so the user doesn't
   * have to hunt for the green start dot. */
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

  /** Compute adherence & deviation for the just-finished segment. */
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
    const miniCorridor = { centerline: seg.centerline, width: effectiveScoringWidth(c.width) };
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
  }, []);

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
    const requiredAd = adaptedStage.requiredAdherence ?? 50;
    const totalOut = results.reduce((s, r) => s + (r.outsideCount ?? 0), 0);
    const totalIn = results.reduce((s, r) => s + (r.insideCount ?? 0), 0);
    const offPathPercent =
      totalPoints > 0 ? Math.round((totalOut / totalPoints) * 100) : 0;
    const jitter =
      jitterSamplesRef.current.length > 0
        ? jitterSamplesRef.current.reduce((a, b) => a + b, 0) / jitterSamplesRef.current.length
        : 0;

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
      success: finalAdherence >= requiredAd,
      activationMethod,
      assistance: {
        corridorWidth: effectiveScoringWidth(c.width),
        autocompleteLevel: adaptedStage.autocompleteLevel,
      },
    });

    reinforcementCompletionsRef.current += 1;
    let newUnlock = null;
    // Only lock stage progression in explicit dev-override mode.
    const pinnedStage = searchParams.get("lockStage") === "1";
    if (!pinnedStage && updateProfile) {
      const next = maybeAdvanceStage({
        profile,
        trialLog: getTrialLog(),
        userId: user?.uid ?? "local",
      });
      if (next != null && next > (profile?.currentStage ?? 0) && next <= 6) {
        const nextStageDef = getStage(next);
        updateProfile({ ...profile, currentStage: next });
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
      unlock: newUnlock,
    });
    setPhase("reward");

    const staged = filterTrials(getTrialLog(), {
      userId: user?.uid ?? "local",
      mode: 2,
      stage: stage.stage,
    });
    const mastery = evaluateMastery(stage, staged);
    setMasteryHint(getMasteryFeedback(stage, mastery));
    if (finalAdherence < 20) {
      setAttemptFeedback(
        language === "ur"
          ? "اچھی کوشش! آغاز کے سبز نقطے کے قریب رہنے کی کوشش کریں۔"
          : "Nice try - keep close to the green start point first.",
      );
    } else if (finalAdherence < requiredAd) {
      setAttemptFeedback(
        language === "ur"
          ? "تقریباً ہو گیا۔ اگلی بار تھوڑا آہستہ چلیں۔"
          : "Almost there. Go a little slower on the next line.",
      );
    } else {
      setAttemptFeedback(
        language === "ur"
          ? "بہت اچھا! اسی رفتار سے جاری رکھیں۔"
          : "Great control. Keep this pace.",
      );
    }
  }, [user?.uid, stage, adaptedStage, attempt, activationMethod, profile, updateProfile, searchParams, language]);

  /** Finalise the current segment and either advance or finish the attempt. */
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

    // Reset for next segment (or end of attempt).
    userPathRef.current = [];
    wobbleIndicesRef.current = [];
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

    try {
      playSuccessBeep();
    } catch {
      /* ignore */
    }

    // Advance to the next side.  Snap the cursor to its start and bump the
    // per-attempt adherence display to the weighted running average.
    const runningAdh =
      segmentResultsRef.current.reduce((s, r) => s + r.adherence * r.points, 0) /
      Math.max(1, segmentResultsRef.current.reduce((s, r) => s + r.points, 0));
    setAdherence(Math.round(runningAdh));
    setSegmentIndex(nextIndex);
    const nextSeg = segs[nextIndex];
    if (nextSeg?.start) {
      snapCursorToCanvasPoint(nextSeg.start.x, nextSeg.start.y);
    }
  }, [computeSegmentResult, finishAttempt, segmentsFor, snapCursorToCanvasPoint]);

  const startDrawingSegment = useCallback(() => {
    if (phaseRef.current !== "trial") return;
    if (isDrawingRef.current) return;
    const seg = currentSegmentRef.current;
    isDrawingRef.current = true;
    if (freezeRecalibrationRef) freezeRecalibrationRef.current = true;
    setIsDrawing(true);
    setInstructionDismiss((n) => n + 1);
    userPathRef.current = seg?.start ? [{ x: seg.start.x, y: seg.start.y }] : [];
    wobbleIndicesRef.current = [];
    maxProjIdxRef.current = 0;
    guideIdxRef.current = 0;
    startTsRef.current = Date.now();
    lastAdherenceSampleRef.current = { x: seg?.start?.x ?? null, y: seg?.start?.y ?? null, ts: performance.now() };
    debugSamplesRef.current = [];
    if (seg?.start) snapCursorToCanvasPoint(seg.start.x, seg.start.y);
    segmentStartLockUntilRef.current = performance.now() + START_LOCK_MS;
    lastHeadCanvasPosRef.current = seg?.start ? { x: seg.start.x, y: seg.start.y } : null;
    stallFramesRef.current = 0;
    reachedHalfwayRef.current = false;
  }, [freezeRecalibrationRef, snapCursorToCanvasPoint]);

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

  // First mouth-open starts drawing; mouth-close is ignored.
  const handlePenToggle = useCallback(
    (down) => {
      if (!down) return;
      startDrawingSegment();
    },
    [startDrawingSegment],
  );

  const { processLandmarks } = useGestureControl({
    cursorPosRef,
    activationMethod,
    onPenToggle: handlePenToggle,
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
      } else if (!isDrawingRef.current && seg?.start) {
        // In-trial but waiting for mouth-open: park the cursor exactly on
        // the green start dot.  This is what prevents the old "big jump"
        // at activation — the cursor was already there.
        const startScreen = canvasToScreen(seg.start.x, seg.start.y);
        displayCursorRef.current.x = startScreen.x;
        displayCursorRef.current.y = startScreen.y;
      }

      if (
        inTrial &&
        isDrawingRef.current &&
        canvasRef.current &&
        seg?.centerline?.length
      ) {
        const { x, y } = getCanvasCoordinates(
          canvasRef.current,
          cursorPosRef.current.x,
          cursorPosRef.current.y,
        );
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

        const near = getNearestPointOnPath({ x, y }, seg.centerline);
        const Lpath = seg.centerline.length;
        const pathFloat = Math.max(
          0,
          Math.min(Lpath - 1, near.pathIndexFloat ?? (near.pathIndex ?? 0)),
        );
        const prevIdx = maxProjIdxRef.current ?? 0;
        const along = pathFloat - prevIdx;
        const dist = distanceToPath({ x, y }, seg.centerline);
        const threshold = effectiveScoringWidth(c.width) / 2;
        const inCorridor = dist <= threshold;
        const hardOffCorridor = dist > threshold * OFF_CORRIDOR_HARD_MULTIPLIER;
        const softOffCorridor = dist > threshold * OFF_CORRIDOR_SOFT_MULTIPLIER;
        const lastHead = lastHeadCanvasPosRef.current;
        const headMove = lastHead ? Math.hypot(x - lastHead.x, y - lastHead.y) : 0;
        lastHeadCanvasPosRef.current = { x, y };
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
          Math.hypot(x - last.x, y - last.y) >= ADHERENCE_MIN_SAMPLE_DIST;
        const elapsedEnough = now - (last.ts ?? 0) >= ADHERENCE_MIN_SAMPLE_MS;
        const progressedEnough = along > 0.35;
        let sampled = false;
        if (movedEnough || (elapsedEnough && progressedEnough)) {
          userPathRef.current.push({ x, y });
          lastAdherenceSampleRef.current = { x, y, ts: now };
          sampled = true;
          if (debugScoring) {
            debugSamplesRef.current.push({
              x,
              y,
              inCorridor,
              dist,
              threshold,
              nearX: near?.point?.x ?? x,
              nearY: near?.point?.y ?? y,
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
          completeSegment();
        } else if (closedBigShape && progress >= 0.8 && userPathRef.current.length > 40) {
          const last = userPathRef.current[userPathRef.current.length - 1];
          const back = Math.hypot(last.x - seg.start.x, last.y - seg.start.y);
          if (back < 80 && !hardOffCorridor && reachedHalfwayRef.current) {
            isDrawingRef.current = false;
            if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
            setIsDrawing(false);
            completeSegment();
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
    if (phase === "demo") {
      sayPhrase("watchMe", language);
      setTimeout(() => sayPhrase("trace", language), 1400);
    }
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
      ctx.fillStyle = "#16A34A";
      ctx.fill();
      if (!activeSeg.closed) {
        ctx.beginPath();
        ctx.arc(activeSeg.end.x, activeSeg.end.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = "#DC2626";
        ctx.fill();
      } else if (activeSeg.centerline.length > 2) {
        // Closed shapes (circle/sun) have same start/end point; show an explicit
        // halfway checkpoint so users know where to head first.
        const midIdx = Math.floor((activeSeg.centerline.length - 1) * 0.5);
        const mid = activeSeg.centerline[midIdx];
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = reachedHalfwayRef.current ? "#22C55E" : "#F59E0B";
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
        ctx.fillStyle = "#22C55E";
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

  const beginTrial = useCallback(() => {
    if (phaseRef.current !== "demo") return;
    // Snap the cursor to the first segment's start so the user isn't
    // hunting.  Fallback to window centre if the corridor isn't ready yet.
    const c = corridorRef.current;
    const segs = segmentsFor(c);
    const firstSeg = segs[0];
    if (firstSeg?.start) {
      snapCursorToCanvasPoint(firstSeg.start.x, firstSeg.start.y);
    } else {
      recenter();
    }
    setPhase("trial");
  }, [recenter, segmentsFor, snapCursorToCanvasPoint]);

  const finishNow = useCallback(() => {
    if (phaseRef.current !== "trial") return;
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
    setIsDrawing(false);
    completeSegment();
  }, [completeSegment, freezeRecalibrationRef]);

  function saveToGallery() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const thumbnail = canvas.toDataURL("image/png");
      const list = JSON.parse(localStorage.getItem("easeL_gallery") || "[]");
      list.push({
        title: `${stage.title} (${language === "ur" ? stage.titleUr ?? stage.title : stage.title})`,
        type: "lesson",
        stage: stage.stage,
        color: "quality",
        createdAt: Date.now(),
        thumbnail,
      });
      localStorage.setItem("easeL_gallery", JSON.stringify(list));
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
      return;
    }
    setScoreSprinklesOn(true);
    playCheerSound();
    const t = setTimeout(() => setScoreSprinklesOn(false), SCORE_REVEAL_MS);
    return () => {
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
      if (cursorElRef.current) {
        cursorElRef.current.style.left = smoothed.x + "px";
        cursorElRef.current.style.top = smoothed.y + "px";
        const q = latestQualityRef.current;
        if (q.active) {
          const rgb = distToStrokeRgb(q.dist, q.threshold);
          cursorElRef.current.style.backgroundColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          cursorElRef.current.style.boxShadow = `0 0 8px rgba(${rgb.r},${rgb.g},${rgb.b},0.55), 0 2px 6px rgba(0,0,0,0.12)`;
        } else {
          cursorElRef.current.style.backgroundColor = "#64748B";
          cursorElRef.current.style.boxShadow = isDrawingRef.current
            ? "0 0 6px rgba(100,116,139,0.35), 0 2px 6px rgba(0,0,0,0.12)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)";
        }
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
  }, []);

  if (sessionTimer.capped) {
    return <BreakPrompt kind="cap" language={language} onExit={handleExit} />;
  }

  const variant = variantForAttempt(stage, attempt);
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
      : "bg-indigo-50 text-indigo-700 border-indigo-200";
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
      : "bg-indigo-500";

  return (
    <div
      className="relative w-screen min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 flex flex-col items-center pt-20 pb-4 px-4 overflow-hidden"
      style={{ cursor: "none" }}
    >
      <MasteryToast message={masteryToast} language={language} />
      <LessonInstructionCard
        stage={stage.stage}
        mode={2}
        language={language}
        active={phase === "trial" && !isDrawing && segmentIndex === 0}
        dismissSignal={instructionDismiss}
      />

      <div className="w-full max-w-[1200px] flex items-center justify-between gap-3 mb-2 z-20 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/95 shadow border border-slate-200/80">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Level {stage.stage}
          </span>
          <span className="text-slate-800 font-bold text-base">{title}</span>
          {variant && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold capitalize">
              {variant}
            </span>
          )}
          {phase === "trial" && showSegmentCounter && (
            <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold">
                  {language === "ur"
                ? `مرحلہ ${segmentIndex + 1} / ${totalSegments}`
                : `Step ${segmentIndex + 1} of ${totalSegments}`}
            </span>
          )}
        </div>

        {phase === "trial" && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shadow-sm transition-colors ${moodPillClass}`}
          >
            {mood === "good" && <CheckCircle2 className="w-4 h-4" />}
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
              {language === "ur" ? "ارادہ" : "Intent"}
            </span>
            <span className="text-xl font-extrabold tabular-nums">{adherence}%</span>
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
          {phase === "trial" && isDrawing && (
            <button
              type="button"
              onClick={finishNow}
              className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {language === "ur" ? "ختم کریں" : "Finish line"}
            </button>
          )}
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
            <LogOut className="w-5 h-5" />
            {language === "ur" ? "ختم" : "Exit"}
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mb-2 z-10">
        <div className="rounded-xl bg-indigo-600 text-white px-4 py-2 shadow border border-indigo-700/50 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {phase === "demo"
              ? language === "ur"
                ? "پہلے دیکھیں…"
                : "Watch the shape draw itself…"
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
          <span className="text-xs font-medium text-indigo-100 bg-indigo-800/40 px-2 py-1 rounded-lg">
            {Math.floor(sessionTimer.elapsedMs / 60000)}:
            {String(Math.floor((sessionTimer.elapsedMs % 60000) / 1000)).padStart(2, "0")}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200 text-slate-700 text-[11px] font-semibold">
            Green dot = start
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200 text-slate-700 text-[11px] font-semibold">
            Follow the blue line at your pace
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200 text-slate-700 text-[11px] font-semibold">
            Slightly outside still counts
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
        className={`rounded-3xl shadow-2xl border-2 border-slate-200/90 bg-white transition-[box-shadow] ${canvasMoodClass}`}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          // Fit within the viewport on common laptop screens: cap by the
          // physical width of the canvas, the available horizontal space, and
          // the space left after the navbar + header + progress bar + webcam.
          maxWidth: `min(1100px, calc((100vh - 260px) * ${CANVAS_WIDTH} / ${CANVAS_HEIGHT}))`,
        }}
      />

      {phase === "trial" && (
        <div className="w-full max-w-[1200px] mt-2 px-2 z-20">
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
            <span className="tabular-nums text-slate-500">{progressPct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
            <div
              className={`h-full ${progressBarColor} transition-[width,background-color] duration-200 rounded-full`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <GhostStrokePreview
        canvasRef={canvasRef}
        centerline={phase === "demo" ? corridor?.centerline : null}
        active={phase === "demo"}
        color="#a855f7"
        durationMs={900}
        lineWidth={10}
        maxAlpha={0.4}
        drawBackdrop={(ctx) => {
          const canvas = canvasRef.current;
          const c = corridorRef.current;
          if (!canvas || !c?.centerline?.length) return;
          ctx.fillStyle = "#FAFAFF";
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
          ctx.fillStyle = "#16A34A";
          ctx.fill();
        }}
        onDone={() => {
          beginTrial();
        }}
      />

      {phase === "trial" && !isDrawing && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="px-6 py-3 rounded-2xl bg-white/95 border-2 border-indigo-300 text-indigo-800 font-semibold shadow-lg">
            {language === "ur"
              ? "منہ کھول کر لکیر بنانا شروع کریں"
              : "Open your mouth to start drawing"}
          </div>
        </div>
      )}

      {phase === "trial" && (
        <div className="absolute left-4 bottom-4 z-30 rounded-xl bg-white/92 text-slate-700 border border-slate-300 px-3 py-2 text-[11px] font-semibold">
          The line uses a few clear colours for how close you stay to the path
          (green and teal through amber to red). A bright white-and-gold ring
          on the tip means you’re on track—keep it steady. The pointer matches
          the line colour.
        </div>
      )}

      {phase === "reward" && finishedPayload && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-3 sm:p-4">
          <div
            className="max-w-md w-full rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
          >
            <div
              className={`shrink-0 px-5 pt-4 pb-3 text-center border-b ${
                finishedPayload.passed
                  ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100/80"
                  : "bg-gradient-to-br from-amber-50 to-orange-50/80 border-amber-100/80"
              }`}
            >
              <div
                className={`w-12 h-12 mx-auto mb-2 rounded-2xl flex items-center justify-center shadow-md ${
                  finishedPayload.passed
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    : "bg-gradient-to-br from-amber-500 to-orange-500 text-white"
                }`}
              >
                {finishedPayload.passed ? (
                  <Trophy className="w-7 h-7" />
                ) : (
                  <Sparkles className="w-7 h-7" />
                )}
              </div>
              <h2
                id="result-title"
                className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
              >
                {language === "ur"
                  ? finishedPayload.passed
                    ? "بہت اچھا!"
                    : "مکمل!"
                  : finishedPayload.passed
                  ? "Nice work!"
                  : "All done!"}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                {title}
                {variant ? ` · ${variant}` : ""}
              </p>
            </div>

            <div className="px-5 py-3 text-center relative shrink-0">
              <div className="relative mx-auto w-full max-w-sm min-h-[8.5rem] flex flex-col items-center justify-center">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 w-full max-h-36 pointer-events-none">
                  <ScoreSprinkles
                    active={scoreSprinklesOn}
                    lowStimulation={lowStim}
                    duration={SCORE_REVEAL_MS}
                  />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                    {language === "ur" ? "آپ کا نمبر" : "Your score"}
                  </p>
                  <p
                    key={`score-${attempt}-${finishedPayload.adherence}`}
                    className="easeL-score-reveal text-4xl sm:text-5xl font-black tabular-nums text-slate-900 leading-tight"
                    style={{ animationDuration: `${SCORE_REVEAL_MS}ms` }}
                  >
                    {finishedPayload.adherence}
                    <span className="text-xl sm:text-2xl font-bold text-slate-500">%</span>
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] sm:text-xs">
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    finishedPayload.passed
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200/80"
                      : "bg-amber-100 text-amber-900 border border-amber-200/80"
                  }`}
                >
                  {finishedPayload.passed
                    ? language === "ur"
                      ? "پاس"
                      : "Passed"
                    : language === "ur"
                    ? "اگلی بار"
                    : "Not quite yet"}
                </span>
                <span className="px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {language === "ur" ? "کامیابی کے لیے" : "To pass:"}{" "}
                  {finishedPayload.requiredAdherence}%
                </span>
              </div>
            </div>

            {attemptFeedback ? (
              <div className="px-5 pb-2 shrink-0">
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-left text-xs sm:text-sm text-slate-600 leading-snug">
                  <p className="font-semibold text-slate-700 mb-0.5 text-[10px] uppercase tracking-wide">
                    {language === "ur" ? "کیسا رہا؟" : "How it went"}
                  </p>
                  <p>{attemptFeedback}</p>
                </div>
              </div>
            ) : null}

            {finishedPayload.unlock ? (
              <div className="px-5 pb-2 shrink-0">
                <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/90 px-3 py-2 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    {language === "ur" ? "نیا مرحلہ" : "New stage"}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {finishedPayload.unlock.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (finishedPayload?.unlock) {
                        navigate(`/lesson-path2?stage=${finishedPayload.unlock.stage}`);
                      }
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900"
                  >
                    {language === "ur" ? "اس مرحلہ پر جائیں" : "Start this level"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="px-5 pt-1 pb-4 flex flex-col gap-2 mt-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => saveToGallery()}
                  disabled={saved}
                  className={`inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-2xl font-bold shadow-md transition-all ${
                    saved
                      ? "bg-emerald-500 text-white cursor-default"
                      : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:opacity-95"
                  }`}
                >
                  <Save className="w-5 h-5" />
                  {saved
                    ? language === "ur"
                      ? "گیلری میں محفوظ"
                      : "Saved to gallery"
                    : language === "ur"
                    ? "گیلری میں محفوظ کریں"
                    : "Save to gallery"}
                </button>
                <button
                  type="button"
                  onClick={nextAttempt}
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-2xl font-bold border-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm"
                >
                  <RotateCcw className="w-5 h-5" />
                  {language === "ur" ? "دوبارہ کوشش" : "Try again"}
                </button>
              </div>

              {stage.stage < 6 ? (
                <button
                  type="button"
                  onClick={() => navigate(`/lesson-path2?stage=${stage.stage + 1}`)}
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-2xl font-bold bg-slate-900 text-white hover:bg-slate-800"
                >
                  {language === "ur" ? "اگلی سطح" : "Next stage"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
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
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-2xl font-semibold border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                >
                  <Home className="w-4 h-4" />
                  {language === "ur" ? "ہوم" : "App home"}
                </button>
                <button
                  type="button"
                  onClick={handleExit}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-2xl font-medium text-slate-600 border border-slate-200/90 hover:bg-slate-50"
                >
                  <BookOpen className="w-4 h-4" />
                  {language === "ur" ? "سبق منتخب کریں" : "Back to lessons"}
                </button>
              </div>
            </div>
          </div>
        </div>
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

      <Cursor
        ref={cursorElRef}
        variant="lesson"
        liveRefColor
        size={isDrawing ? 8 : 10}
        color="#4338CA"
        isPenDown={isDrawing || phase === "trial"}
        tool="pencil"
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
