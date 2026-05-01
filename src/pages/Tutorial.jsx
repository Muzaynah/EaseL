import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../context/AppStateContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { updatePositionTiltWithCalibration, createTiltStateWithCalibration } from "../utils/cursorMappings";
import { speakInstruction, stopSpeech } from "../utils/screenerAudio";
import Cursor from "../components/Cursor";
import { Volume2, VolumeX } from "lucide-react";

const INSTRUCTION = "Your movement moves your brush. Move your head to see the cursor follow.";
const INSTRUCTION_SPOKEN = "Your movement moves your brush. Move your head to see the cursor follow.";

function getInitialCursorPosition() {
  if (typeof window === "undefined") return { x: 400, y: 300 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * First-time cursor tutorial: live camera preview (like Calibration) and live brush/cursor
 * so the user sees that their head movement moves the brush. Simple one-screen flow.
 */
export default function Tutorial() {
  const navigate = useNavigate();
  const { updateProfile, profile } = useAuth();
  const { settings } = useAppState();
  const videoRef = useRef(null);
  const cursorPosRef = useRef(getInitialCursorPosition());
  const tiltStateRef = useRef(createTiltStateWithCalibration());
  const calibrationRef = useRef(profile?.calibration ?? null);
  const [cursorPos, setCursorPos] = useState(() => getInitialCursorPosition());
  const [muted, setMuted] = useState(false);
  const spokenRef = useRef(false);

  calibrationRef.current = profile?.calibration ?? null;

  useEffect(() => {
    calibrationRef.current = profile?.calibration ?? null;
  }, [profile?.calibration]);

  const sensitivityOptions = {
    headSensitivity: settings?.headSensitivity ?? 75,
    deadZone: settings?.deadZone ?? 25,
  };

  const handleResults = useCallback((results) => {
    try {
      const landmarks = results?.multiFaceLandmarks?.[0];
      if (!landmarks) return;
      updatePositionTiltWithCalibration(landmarks, cursorPosRef, tiltStateRef, calibrationRef.current, sensitivityOptions);
    } catch (e) {
      if (typeof console !== "undefined" && console.warn) console.warn("[EaseL] Tutorial handleResults:", e);
    }
  }, [settings?.headSensitivity, settings?.deadZone]);

  const { startFaceMesh } = useFaceMesh({ videoRef, onResults: handleResults });

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
    if (spokenRef.current) return;
    spokenRef.current = true;
    speakInstruction(INSTRUCTION_SPOKEN);
    return () => stopSpeech();
  }, [muted]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const pos = cursorPosRef.current;
      setCursorPos((prev) => {
        if (prev.x === pos.x && prev.y === pos.y) return prev;
        return { x: pos.x, y: pos.y };
      });
    };
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleComplete = async () => {
    stopSpeech();
    await updateProfile((p) => ({ ...p, tutorialPassed: true }));
    navigate("/screener", { replace: true });
  };

  return (
    <div className="easeL-page-bg flex min-h-screen flex-col items-center justify-center px-6 pb-20 pt-32">
      <div
        className="animate-fade-scale-in w-full max-w-lg rounded-3xl p-8 text-center shadow-2xl"
        style={{
          background: "color-mix(in srgb, var(--easeL-bg-section) 94%, transparent)",
          border: "2px solid var(--easeL-border-subtle)",
        }}
      >
        <div className="flex justify-end -mt-1 -mr-1 mb-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="rounded-full p-2 transition-colors hover:opacity-90"
            style={{ color: "var(--easeL-text-muted)" }}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <h1 className="mb-2 text-2xl font-bold" style={{ color: "var(--easeL-text)" }}>
          Your movement moves your brush
        </h1>
        <p className="mb-6 text-lg" style={{ color: "var(--easeL-text-muted)" }}>
          {INSTRUCTION}
        </p>

        <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-slate-900 border-4 border-white/80 shadow-2xl mx-auto mb-8">
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            autoPlay
            muted
            playsInline
          />
        </div>

        <button
          type="button"
          onClick={handleComplete}
          className="easeL-btn-solid w-full text-lg transition-all"
        >
          Continue
        </button>
      </div>

      <Cursor
        size={24}
        isPenDown={false}
        tool="brush"
        left={cursorPos.x}
        top={cursorPos.y}
      />
    </div>
  );
}
