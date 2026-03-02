import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useGestureControl } from "../hooks/useGestureControl";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useIntentCapture } from "../hooks/useIntentCapture";
import { getCurrentTierConfig } from "../utils/modeConfig";
import { logTrialResult, clearTrialHistory } from "../utils/masteryLogic";
import Cursor from "../components/Cursor";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
const MARGIN = 150;

/** Tilt angle in degrees from eye landmarks (33 = left eye, 263 = right eye). -180 to 180. */
function getTiltAngleFromLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 264) return 0;
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  if (!leftEye || !rightEye) return 0;
  return Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
}

function getRequiredDirection(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return "right";
  if (angle >= 22.5 && angle < 67.5) return "down-right";
  if (angle >= 67.5 && angle < 112.5) return "down";
  if (angle >= 112.5 && angle < 157.5) return "down-left";
  if (angle >= 157.5 || angle < -157.5) return "left";
  if (angle >= -157.5 && angle < -112.5) return "up-left";
  if (angle >= -112.5 && angle < -67.5) return "up";
  return "up-right";
}

export default function Mode1Lesson() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const cursorRef = useRef(null);
  const buttonRefs = useRef({});
  const soundPlayingRef = useRef(false);

  const { cursorPosRef, updateCursorFromLandmarks } = useCalibratedCursor(profile);
  const calibration = profile?.calibration ?? {};
  const activationMethod = calibration.activationMethod ?? "mouth";

  const [tierConfig, setTierConfig] = useState(null);
  const [currentTier, setCurrentTier] = useState(0);
  const [targets, setTargets] = useState([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [currentPos, setCurrentPos] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isPenDown, setIsPenDown] = useState(false);
  const [detectedDirection, setDetectedDirection] = useState(null);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const currentTargetIndexRef = useRef(0);
  const targetsRef = useRef([]);
  const tierConfigRef = useRef(null);
  const currentPosRef = useRef(currentPos);
  const currentTierRef = useRef(0);
  currentTargetIndexRef.current = currentTargetIndex;
  targetsRef.current = targets;
  tierConfigRef.current = tierConfig;
  currentPosRef.current = currentPos;
  currentTierRef.current = currentTier;

  function playSuccessSound() {
    if (soundPlayingRef.current) return;
    soundPlayingRef.current = true;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      setTimeout(() => { soundPlayingRef.current = false; }, 350);
    } catch (_) {
      soundPlayingRef.current = false;
    }
  }

  const handleStrokeComplete = useCallback(
    ({ direction, endPos }) => {
      const config = tierConfigRef.current;
      const idx = currentTargetIndexRef.current;
      const targetList = targetsRef.current;
      const tier = currentTierRef.current;
      if (!config || idx >= targetList.length || !user?.uid) return;
      const target = targetList[idx];
      const from = currentPosRef.current;
      const requiredDirection = getRequiredDirection(from, target);
      const correct = direction === requiredDirection;
      const distToTarget = Math.sqrt(
        Math.pow(endPos.x - target.x, 2) + Math.pow(endPos.y - target.y, 2)
      );
      const reached = distToTarget <= config.targetSize / 2;
      const success = correct && reached;
      logTrialResult(user.uid, 1, tier, {
        success,
        accuracy: correct ? 100 : 0,
        timestamp: Date.now(),
      });
      setAttempts((a) => a + 1);
      if (success) {
        setScore((s) => s + 1);
        setFeedback("Perfect! 🎉");
        playSuccessSound();
        setCurrentPos(endPos);
        setTimeout(() => {
          if (idx < targetList.length - 1) {
            setCurrentTargetIndex(idx + 1);
            setFeedback("");
          } else {
            setLessonComplete(true);
            setFeedback("Lesson Complete!");
          }
        }, 1500);
      } else {
        setFeedback("Try again – tilt toward the star");
        setTimeout(() => setFeedback(""), 2000);
      }
    },
    [user?.uid]
  );

  const { detectDirection, executeStroke } = useIntentCapture({
    tiltAngle,
    autocompleteLevel: tierConfig?.autocompleteLevel ?? 100,
    onStrokeComplete: handleStrokeComplete,
  });

  const { processLandmarks } = useGestureControl({
    cursorPosRef,
    activationMethod,
    onPenToggle: (down) => {
      if (down && !isPenDown) handleActivation();
      setIsPenDown(down);
    },
    buttonRefs,
    mouthOpenThreshold: 0.022,
    framesToConfirm: 1,
    cooldownMs: 200,
    dwellMs: 800,
    dwellRadius: 15,
  });

  const { startFaceMesh } = useFaceMesh({
    videoRef,
    onResults: handleFaceResults,
  });

  function generateTargets(config) {
    const newTargets = [];
    for (let i = 0; i < config.targetCount; i++) {
      newTargets.push({
        x: MARGIN + Math.random() * (CANVAS_WIDTH - 2 * MARGIN),
        y: MARGIN + Math.random() * (CANVAS_HEIGHT - 2 * MARGIN),
      });
    }
    setTargets(newTargets);
    setCurrentTargetIndex(0);
    setCurrentPos({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  }

  async function loadUserProfile() {
    if (!user?.uid) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (!db) {
        const config = getCurrentTierConfig(1, 0);
        setTierConfig(config);
        setCurrentTier(0);
        generateTargets(config);
        setLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, "profiles", user.uid));
      const userData = userDoc.data() || {};
      const tier = userData.currentStage ?? 0;
      const config = getCurrentTierConfig(1, tier);
      setCurrentTier(tier);
      setTierConfig(config);
      generateTargets(config);
      clearTrialHistory(user.uid, 1, tier);
    } catch (e) {
      console.warn("Mode1Lesson loadUserProfile", e);
      setLoadError("Could not load profile. Using default tier.");
      const config = getCurrentTierConfig(1, 0);
      setTierConfig(config);
      setCurrentTier(0);
      generateTargets(config);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUserProfile();
  }, [user?.uid]);

  useEffect(() => {
    const cleanup = startFaceMesh();
    return () => (typeof cleanup === "function" ? cleanup() : undefined);
  }, [startFaceMesh]);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (cursorRef.current) {
        cursorRef.current.style.left = cursorPosRef.current.x + "px";
        cursorRef.current.style.top = cursorPosRef.current.y + "px";
      }
    };
    const loop = () => { tick(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleFaceResults(results) {
    const landmarks = results?.multiFaceLandmarks?.[0];
    if (!landmarks) return;
    updateCursorFromLandmarks(landmarks);
    processLandmarks(landmarks, isPenDown);
    const angleDeg = getTiltAngleFromLandmarks(landmarks);
    setTiltAngle(angleDeg);
    const direction = detectDirection();
    setDetectedDirection(direction);
    drawScene();
  }

  function handleActivation() {
    if (!detectedDirection || detectedDirection === "none") return;
    if (currentTargetIndex >= targets.length || lessonComplete) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const newPos = executeStroke(ctx, currentPosRef.current, detectedDirection);
    if (newPos) setCurrentPos(newPos);
  }

  function drawScene() {
    const canvas = canvasRef.current;
    if (!canvas || !tierConfig) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (targets.length > 0 && currentTargetIndex < targets.length) {
      const target = targets[currentTargetIndex];
      ctx.beginPath();
      ctx.arc(target.x, target.y, tierConfig.targetSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#FCD34D";
      ctx.fill();
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⭐", target.x, target.y);
    }

    ctx.beginPath();
    ctx.arc(currentPos.x, currentPos.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#6366F1";
    ctx.fill();
    ctx.strokeStyle = "#4338CA";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (detectedDirection && !isPenDown) {
      const distance = 200 * (tierConfig.autocompleteLevel / 100);
      const vectors = {
        right: { x: 1, y: 0 },
        "down-right": { x: 0.707, y: 0.707 },
        down: { x: 0, y: 1 },
        "down-left": { x: -0.707, y: 0.707 },
        left: { x: -1, y: 0 },
        "up-left": { x: -0.707, y: -0.707 },
        up: { x: 0, y: -1 },
        "up-right": { x: 0.707, y: -0.707 },
      };
      const vector = vectors[detectedDirection];
      if (vector) {
        const endX = currentPos.x + vector.x * distance;
        const endY = currentPos.y + vector.y * distance;
        ctx.beginPath();
        ctx.moveTo(currentPos.x, currentPos.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function handleExit() {
    if (user?.uid) clearTrialHistory(user.uid, 1, currentTier);
    navigate("/lessons");
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    );
  }

  if (!tierConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 gap-4">
        <p className="text-red-600 font-medium">Failed to load lesson.</p>
        <button onClick={() => navigate("/lessons")} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700">Back to lessons</button>
      </div>
    );
  }

  if (lessonComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-8">
        <div className="max-w-md w-full rounded-3xl bg-white shadow-2xl border-2 border-emerald-200 p-8 text-center">
          <p className="text-2xl font-bold text-emerald-800 mb-2">Lesson Complete!</p>
          <p className="text-slate-600 mb-6">You finished all targets. Choose below.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setLessonComplete(false);
                setFeedback("");
                generateTargets(tierConfig);
              }}
              className="w-full py-3 rounded-2xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Practice again
            </button>
            <button
              onClick={handleExit}
              className="w-full py-3 rounded-2xl font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              Back to lessons
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 flex flex-col items-center pt-20 pb-12 px-4">
      {loadError && (
        <div className="w-full max-w-[1200px] mb-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-sm text-center">
          {loadError}
        </div>
      )}
      <div className="w-full max-w-[1200px] flex items-center justify-between gap-4 mb-4 z-20">
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/95 shadow-lg border border-slate-200/80">
          <span className="text-sm font-medium text-slate-500">Mode 1</span>
          <span className="text-slate-700 font-semibold">{tierConfig.name}</span>
          <span className="text-slate-400">·</span>
          <span className="text-indigo-600 font-bold">
            Target {currentTargetIndex + 1} of {targets.length}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600 text-sm">Assistance {tierConfig.autocompleteLevel}%</span>
        </div>
        <button
          onClick={handleExit}
          className="px-5 py-2.5 rounded-xl bg-slate-200/90 hover:bg-slate-300 text-slate-700 font-semibold shadow border border-slate-300/80 z-20"
        >
          Exit
        </button>
      </div>

      <div className="w-full max-w-[1200px] mb-3 z-20 px-1">
        <div className="rounded-2xl bg-indigo-600 text-white px-6 py-3 shadow-lg border border-indigo-700/50">
          <p className="text-lg font-bold">Tilt your head toward the star, then {activationMethod === "dwell" ? "hold the cursor still" : "open your mouth"} to draw.</p>
          {detectedDirection && (
            <p className="text-sm mt-1 text-indigo-100">Direction: {detectedDirection}</p>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-3xl shadow-2xl border-2 border-slate-200/90 bg-white"
      />

      {feedback && !lessonComplete && (
        <div className="mt-6 max-w-[1200px] w-full z-20">
          <div
            className={
              feedback.startsWith("Perfect")
                ? "rounded-2xl bg-emerald-600 text-white px-8 py-4 shadow-xl text-center"
                : "rounded-2xl bg-amber-500 text-slate-900 px-8 py-4 shadow-xl text-center"
            }
          >
            <p className="text-xl font-bold">{feedback}</p>
          </div>
        </div>
      )}

      <Cursor ref={cursorRef} size={16} color="#6366F1" isPenDown={isPenDown} tool="pencil" />
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
    </div>
  );
}
