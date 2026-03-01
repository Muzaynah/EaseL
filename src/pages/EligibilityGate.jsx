import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { updatePositionTilt, createTiltState } from "../utils/cursorMappings";
import Cursor from "../components/Cursor";
import { useAuth } from "../context/AuthContext";

const ATTEMPTS_TOTAL = 3;
const TIME_LIMIT_SEC = 15;
const HOLD_SUCCESS_MS = 2000;
const CIRCLE_RADIUS = 120;

export default function EligibilityGate() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const videoRef = useRef(null);
  const cursorPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const tiltStateRef = useRef(createTiltState());
  const [attempt, setAttempt] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SEC);
  const [holdStart, setHoldStart] = useState(null);
  const [passed, setPassed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attemptsWon, setAttemptsWon] = useState(0);
  const cursorRef = useRef(null);
  const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 400;
  const centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 300;

  const handleResults = useCallback((results) => {
    const landmarks = results.multiFaceLandmarks?.[0];
    updatePositionTilt(landmarks, cursorPosRef, tiltStateRef);
  }, []);

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
    if (passed || failed) return;
    const id = setInterval(() => setTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1)), 1000);
    return () => clearInterval(id);
  }, [passed, failed]);

  useEffect(() => {
    if (timeLeft <= 0 && !passed && !failed) {
      const nextAttempt = attempt + 1;
      if (nextAttempt > ATTEMPTS_TOTAL) {
        setFailed(true);
      } else {
        setAttempt(nextAttempt);
        setTimeLeft(TIME_LIMIT_SEC);
        setHoldStart(null);
      }
    }
  }, [timeLeft, attempt, passed, failed]);

  useEffect(() => {
    if (passed || failed) return;
    const id = setInterval(() => {
      const x = cursorPosRef.current.x;
      const y = cursorPosRef.current.y;
      const dist = Math.hypot(x - centerX, y - centerY);
      const inside = dist <= CIRCLE_RADIUS;
      if (inside) {
        const now = Date.now();
        setHoldStart((prev) => (prev === null ? now : prev));
      } else {
        setHoldStart(() => null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [passed, failed, centerX]);

  useEffect(() => {
    if (passed || failed || holdStart === null) return;
    const id = setInterval(() => {
      if (Date.now() - holdStart >= HOLD_SUCCESS_MS) {
        setAttemptsWon((w) => w + 1);
        setHoldStart(null);
      }
    }, 200);
    return () => clearInterval(id);
  }, [passed, failed, holdStart]);

  useEffect(() => {
    if (attemptsWon >= ATTEMPTS_TOTAL) setPassed(true);
    else if (attemptsWon > 0) {
      setAttempt(attemptsWon + 1);
      setTimeLeft(TIME_LIMIT_SEC);
    }
  }, [attemptsWon]);

  useEffect(() => {
    if (!passed) return;
    (async () => {
      await updateProfile((p) => ({ ...p, eligibilityPassed: true }));
      navigate("/calibration", { replace: true });
    })();
  }, [passed, navigate, updateProfile]);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (cursorRef.current) {
        cursorRef.current.style.left = cursorPosRef.current.x + "px";
        cursorRef.current.style.top = cursorPosRef.current.y + "px";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (passed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24">
        <p className="text-slate-600">Taking you to calibration…</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 px-6">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Eligibility not met</h1>
          <p className="text-slate-600 mb-6">
            A caregiver can help adjust the setup or try again later. This does not prevent using other parts of EaseL.
          </p>
          <button
            onClick={async () => {
              await updateProfile((p) => ({ ...p, eligibilityPassed: false }));
              navigate("/home", { replace: true });
            }}
            className="w-full min-h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 flex flex-col items-center justify-center overflow-hidden">
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <p className="text-slate-700 font-medium mb-2">Attempt {attempt} of {ATTEMPTS_TOTAL}</p>
      <p className="text-slate-600 text-sm mb-2">Time left: {timeLeft}s</p>
      <p className="text-slate-600 mb-8">Tilt your head toward the circle.</p>
      <div
        className="fixed rounded-full border-4 border-indigo-400 bg-indigo-100/50"
        style={{
          width: CIRCLE_RADIUS * 2,
          height: CIRCLE_RADIUS * 2,
          left: centerX - CIRCLE_RADIUS,
          top: centerY - CIRCLE_RADIUS,
        }}
      />
      <Cursor
        ref={cursorRef}
        size={24}
        color="#6366f1"
        isPenDown={false}
        tool="brush"
      />
    </div>
  );
}
