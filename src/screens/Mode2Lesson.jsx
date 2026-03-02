import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useGestureControl } from "../hooks/useGestureControl";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useDrawing } from "../hooks/useDrawing";
import { getCurrentTierConfig } from "../utils/modeConfig";
import { generateCorridor, calculateAdherence } from "../utils/corridorGeometry";
import { logTrialResult, clearTrialHistory } from "../utils/masteryLogic";
import { getCanvasCoordinates } from "../utils/canvasUtils";
import Cursor from "../components/Cursor";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
const ADHERENCE_UPDATE_EVERY_N_POINTS = 10;

function drawCorridor(ctx, corridor) {
  if (!corridor?.centerline?.length) return;
  const half = corridor.width / 2;
  ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
  ctx.beginPath();
  for (const point of corridor.centerline) {
    ctx.lineTo(point.x, point.y - half);
  }
  for (let i = corridor.centerline.length - 1; i >= 0; i--) {
    const point = corridor.centerline[i];
    ctx.lineTo(point.x, point.y + half);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(99, 102, 241, 0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  for (let i = 0; i < corridor.centerline.length; i++) {
    const point = corridor.centerline[i];
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(corridor.start.x, corridor.start.y, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#16A34A";
  ctx.fill();
  ctx.strokeStyle = "#15803D";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(corridor.end.x, corridor.end.y, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#DC2626";
  ctx.fill();
  ctx.strokeStyle = "#B91C1C";
  ctx.lineWidth = 3;
  ctx.stroke();
}

export default function Mode2Lesson() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const cursorRef = useRef(null);
  const buttonRefs = useRef({});
  const userPathRef = useRef([]);
  const penToggleRef = useRef(null);
  const soundPlayingRef = useRef(false);

  const { cursorPosRef, updateCursorFromLandmarks } = useCalibratedCursor(profile);
  const calibration = profile?.calibration ?? {};
  const activationMethod = calibration.activationMethod ?? "mouth";

  const [tierConfig, setTierConfig] = useState(null);
  const [currentTier, setCurrentTier] = useState(0);
  const [corridor, setCorridor] = useState(null);
  const [userPath, setUserPath] = useState([]);
  const [currentAdherence, setCurrentAdherence] = useState(0);
  const [isPenDown, setIsPenDown] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const { draw, startStroke, endStroke } = useDrawing({
    canvasRef,
    brushSize: 10,
    brushColor: "#4338CA",
    tool: "pencil",
  });

  const { processLandmarks } = useGestureControl({
    cursorPosRef,
    activationMethod,
    onPenToggle: (down) => penToggleRef.current?.(down),
    buttonRefs,
    mouthOpenThreshold: 0.022,
    framesToConfirm: 1,
    cooldownMs: 200,
    dwellMs: 800,
    dwellRadius: 15,
  });

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

  const resetForNewAttempt = useCallback(() => {
    userPathRef.current = [];
    setUserPath([]);
    setCurrentAdherence(0);
    setFeedback("");
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (corridor) drawCorridor(ctx, corridor);
    }
  }, [corridor]);

  const evaluateAttempt = useCallback(
    (path) => {
      if (!corridor?.centerline?.length || !path.length || !tierConfig || !user?.uid) return;
      const finalAdherence = calculateAdherence(path, corridor);
      const success = finalAdherence >= tierConfig.requiredAdherence;
      logTrialResult(user.uid, 2, currentTier, {
        success,
        accuracy: finalAdherence,
        timestamp: Date.now(),
      });
      setAttempts((a) => a + 1);
      if (success) {
        setFeedback(`Great job! ${finalAdherence}% in corridor 🎉`);
        playSuccessSound();
        setTimeout(() => {
          setFeedback("Ready for next attempt.");
          resetForNewAttempt();
        }, 3000);
      } else {
        setFeedback(`${finalAdherence}% – stay inside the blue path`);
        setTimeout(() => resetForNewAttempt(), 2000);
      }
    },
    [corridor, tierConfig, user?.uid, currentTier, resetForNewAttempt]
  );

  const handlePenToggle = useCallback(
    (down) => {
      setIsPenDown(down);
      if (down) {
        setIsDrawing((prev) => {
          if (!prev) {
            userPathRef.current = [];
            setUserPath([]);
            setCurrentAdherence(0);
            startStroke();
            return true;
          }
          return prev;
        });
      } else {
        setIsDrawing((prev) => {
          if (prev) {
            endStroke();
            evaluateAttempt([...userPathRef.current]);
            return false;
          }
          return prev;
        });
      }
    },
    [startStroke, endStroke, evaluateAttempt]
  );
  penToggleRef.current = handlePenToggle;

  const handleFaceResults = useCallback(
    (results) => {
      const landmarks = results?.multiFaceLandmarks?.[0];
      if (!landmarks) return;
      updateCursorFromLandmarks(landmarks);
      processLandmarks(landmarks, isPenDown);

      if (isDrawing && canvasRef.current) {
        const { x: canvasX, y: canvasY } = getCanvasCoordinates(
          canvasRef.current,
          cursorPosRef.current.x,
          cursorPosRef.current.y
        );
        draw(canvasX, canvasY);
        userPathRef.current.push({ x: canvasX, y: canvasY });
        const pathLen = userPathRef.current.length;
        if (pathLen % ADHERENCE_UPDATE_EVERY_N_POINTS === 0 && corridor) {
          const adherence = calculateAdherence(userPathRef.current, corridor);
          setCurrentAdherence(adherence);
        } else if (pathLen === 1 && corridor) {
          setCurrentAdherence(calculateAdherence(userPathRef.current, corridor));
        }
      }

      const canvas = canvasRef.current;
      if (canvas && corridor) {
        const ctx = canvas.getContext("2d");
        if (!isDrawing) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawCorridor(ctx, corridor);
        }
      }
    },
    [isPenDown, isDrawing, corridor, draw, processLandmarks, updateCursorFromLandmarks]
  );

  const { startFaceMesh } = useFaceMesh({
    videoRef,
    onResults: handleFaceResults,
  });

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

  async function loadUserProfile() {
    if (!user?.uid) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (!db) {
        const config = getCurrentTierConfig(2, 0);
        setTierConfig(config);
        setCurrentTier(0);
        setCorridor(
          generateCorridor(config.corridorType, config.corridorWidth, config.corridorLength, CANVAS_WIDTH, CANVAS_HEIGHT)
        );
        setLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, "profiles", user.uid));
      const userData = userDoc.data() || {};
      const tier = userData.currentStage ?? 0;
      const config = getCurrentTierConfig(2, tier);
      setCurrentTier(tier);
      setTierConfig(config);
      setCorridor(
        generateCorridor(config.corridorType, config.corridorWidth, config.corridorLength, CANVAS_WIDTH, CANVAS_HEIGHT)
      );
      clearTrialHistory(user.uid, 2, tier);
    } catch (e) {
      console.warn("Mode2Lesson loadUserProfile", e);
      setLoadError("Could not load profile. Using default tier.");
      const config = getCurrentTierConfig(2, 0);
      setTierConfig(config);
      setCurrentTier(0);
      setCorridor(
        generateCorridor(config.corridorType, config.corridorWidth, config.corridorLength, CANVAS_WIDTH, CANVAS_HEIGHT)
      );
    }
    setLoading(false);
  }

  function handleExit() {
    if (user?.uid) clearTrialHistory(user.uid, 2, currentTier);
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

  if (!tierConfig || !corridor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 gap-4">
        <p className="text-red-600 font-medium">Failed to load lesson.</p>
        <button onClick={() => navigate("/lessons")} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700">Back to lessons</button>
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
          <span className="text-sm font-medium text-slate-500">Mode 2</span>
          <span className="text-slate-700 font-semibold">{tierConfig.name}</span>
          <span className="text-slate-400">·</span>
          <span className="text-indigo-600 font-bold">{currentAdherence}%</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600 text-sm">Width {tierConfig.corridorWidth}px</span>
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
          <p className="text-lg font-bold">
            {isDrawing ? "Drawing… Keep the cursor in the blue path." : `Move cursor to the path, then ${activationMethod === "dwell" ? "hold still" : "open your mouth"} to start.`}
          </p>
          <p className="text-sm mt-1 text-indigo-100">Start at green → follow path → end at red.</p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-3xl shadow-2xl border-2 border-slate-200/90 bg-white"
      />

      {feedback && (
        <div className="mt-6 max-w-[1200px] w-full z-20">
          <div
            className={
              feedback.includes("Great job") || feedback.includes("Ready")
                ? "rounded-2xl bg-emerald-600 text-white px-8 py-4 shadow-xl text-center"
                : "rounded-2xl bg-amber-500 text-slate-900 px-8 py-4 shadow-xl text-center"
            }
          >
            <p className="text-xl font-bold">{feedback}</p>
          </div>
        </div>
      )}

      <Cursor ref={cursorRef} size={16} color="#4338CA" isPenDown={isPenDown} tool="pencil" />
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
    </div>
  );
}
