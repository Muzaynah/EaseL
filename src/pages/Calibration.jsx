import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SkipForward, ArrowRight, Check, Circle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight as ArrowRightIcon, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../context/AppStateContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { getYawPitch } from "../utils/cursorMappings/getYawPitch";

const TOTAL_STEPS = 6;

// Step 2: resting position = average when "roughly similar" positions steadied for a while. Progress fills from left.
const NEUTRAL_SAMPLE_MS = 100;
const NEUTRAL_STEADY_SAMPLES = 22;   // need this many consecutive "similar" samples
const NEUTRAL_SIMILAR_TILT = 0.07;   // sample within this of running mean
const NEUTRAL_SIMILAR_PITCH = 0.04;
const NEUTRAL_SIMILAR_YAW = 0.06;

// Direction thresholds – applied relative to measured resting position
const TILT_LEFT = -0.14;
const TILT_RIGHT = 0.14;
const YAW_LEFT = -0.08;
const YAW_RIGHT = 0.08;
const PITCH_UP = -0.04;
const PITCH_DOWN = 0.04;

// Mouth open
const MOUTH_OPEN_THRESHOLD = 0.03;
const MOUTH_FRAMES_TO_CONFIRM = 5;

const SMOOTHING = 0.85;
const LIVE_UPDATE_MS = 80;

// Bar with centre line; fill grows LEFT from centre when value < 0, RIGHT from centre when value > 0.
function LiveBar({ value, leftLabel, rightLabel, detectedLeft, detectedRight }) {
  const v = Math.max(-1, Math.min(1, value * 4));
  const leftPct = v < 0 ? Math.min(50, -v * 50) : 0;
  const rightPct = v > 0 ? Math.min(50, v * 50) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span className={detectedLeft ? "text-emerald-600 font-semibold" : ""}>{leftLabel}</span>
        <span className={detectedRight ? "text-emerald-600 font-semibold" : ""}>{rightLabel}</span>
      </div>
      <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
        {leftPct > 0 && (
          <div
            className="absolute inset-y-0 rounded-l-full transition-all duration-75"
            style={{
              background: "var(--easeL-primary-mid)",
              width: `${leftPct}%`,
              right: "50%",
            }}
          />
        )}
        <div className="absolute inset-y-0 w-0.5 bg-slate-700 left-1/2 -translate-x-px z-10" />
        {rightPct > 0 && (
          <div
            className="absolute inset-y-0 rounded-r-full transition-all duration-75"
            style={{
              background: "var(--easeL-primary-mid)",
              width: `${rightPct}%`,
              left: "50%",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function Calibration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateProfile, profile } = useAuth();
  const { setCalibration: syncCalibrationToApp } = useAppState();
  const fromSettings = location.state?.fromSettings === true;
  const isFirstTime = !profile?.calibration?.lastCalibratedAt;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const videoRef = useRef(null);
  const [step, setStep] = useState(1);
  const [neutralDetected, setNeutralDetected] = useState(false);
  const [neutralPosition, setNeutralPosition] = useState(null);
  const [tiltDetected, setTiltDetected] = useState({ left: false, right: false });
  const [turnDetected, setTurnDetected] = useState({ left: false, right: false });
  const [pitchDetected, setPitchDetected] = useState({ up: false, down: false });
  const [mouthDone, setMouthDone] = useState(false);
  const [movementRange, setMovementRange] = useState({
    minTilt: 0, maxTilt: 0, minYaw: 0, maxYaw: 0, minPitch: 0, maxPitch: 0,
  });

  const [live, setLive] = useState({
    tilt: 0, yaw: 0, pitch: 0, mouthHeight: 0, neutralProgress: 0,
  });

  const tiltDone = tiltDetected.left && tiltDetected.right;
  const turnDone = turnDetected.left && turnDetected.right;
  const pitchDone = pitchDetected.up && pitchDetected.down;

  const neutralSampleBufferRef = useRef([]);
  const lastNeutralSampleTimeRef = useRef(0);
  const neutralSteadyCountRef = useRef(0);
  const neutralPositionRef = useRef(null);
  const smoothedTiltRef = useRef(0);
  const smoothedPitchRef = useRef(0);
  const smoothedYawRef = useRef(0);
  const mouthOpenFramesRef = useRef(0);
  const liveRef = useRef({ tilt: 0, yaw: 0, pitch: 0, mouthHeight: 0 });
  const stepRef = useRef(step);
  stepRef.current = step;

  const handleResults = useCallback((results) => {
    const landmarks = results.multiFaceLandmarks?.[0];
    if (!landmarks) return;

    const currentStep = stepRef.current;
    const { tilt, pitch, yaw } = getYawPitch(landmarks);
    smoothedTiltRef.current =
      SMOOTHING * smoothedTiltRef.current + (1 - SMOOTHING) * tilt;
    smoothedPitchRef.current =
      SMOOTHING * smoothedPitchRef.current + (1 - SMOOTHING) * pitch;
    smoothedYawRef.current =
      SMOOTHING * smoothedYawRef.current + (1 - SMOOTHING) * yaw;
    const st = smoothedTiltRef.current;
    const sp = smoothedPitchRef.current;
    const sy = smoothedYawRef.current;

    liveRef.current = {
      tilt: st,
      yaw: sy,
      pitch: sp,
      mouthHeight: (() => {
        const upper = landmarks[13];
        const lower = landmarks[14];
        if (!upper || !lower) return 0;
        return Math.abs(upper.y - lower.y);
      })(),
    };

    if (currentStep === 2) {
      const now = Date.now();
      if (now - lastNeutralSampleTimeRef.current >= NEUTRAL_SAMPLE_MS) {
        lastNeutralSampleTimeRef.current = now;
        const buf = neutralSampleBufferRef.current;
        buf.push({ tilt: st, pitch: sp, yaw: sy });
        if (buf.length > 30) buf.shift();
        const n = buf.length;
        const mean = n >= 3 ? {
          tilt: buf.reduce((a, s) => a + s.tilt, 0) / n,
          pitch: buf.reduce((a, s) => a + s.pitch, 0) / n,
          yaw: buf.reduce((a, s) => a + s.yaw, 0) / n,
        } : null;
        const similar = mean && n >= 3 &&
          Math.abs(st - mean.tilt) < NEUTRAL_SIMILAR_TILT &&
          Math.abs(sp - mean.pitch) < NEUTRAL_SIMILAR_PITCH &&
          Math.abs(sy - mean.yaw) < NEUTRAL_SIMILAR_YAW;
        if (similar) {
          const count = Math.min(NEUTRAL_STEADY_SAMPLES, neutralSteadyCountRef.current + 1);
          neutralSteadyCountRef.current = count;
          const progressPct = Math.min(100, Math.round((count / NEUTRAL_STEADY_SAMPLES) * 100));
          setLive((l) => ({ ...l, neutralProgress: progressPct }));
          if (count >= NEUTRAL_STEADY_SAMPLES) {
            const avg = {
              tilt: buf.reduce((a, s) => a + s.tilt, 0) / buf.length,
              pitch: buf.reduce((a, s) => a + s.pitch, 0) / buf.length,
              yaw: buf.reduce((a, s) => a + s.yaw, 0) / buf.length,
            };
            neutralPositionRef.current = avg;
            setNeutralPosition(avg);
            setNeutralDetected(true);
          }
        } else {
          neutralSteadyCountRef.current = 0;
          setLive((l) => ({ ...l, neutralProgress: 0 }));
        }
      }
    }

    const neutral = neutralPositionRef.current;
    if (currentStep === 3 && neutral) {
      const relTilt = st - neutral.tilt;
      setTiltDetected((d) => ({ ...d, left: d.left || relTilt > TILT_RIGHT, right: d.right || relTilt < TILT_LEFT }));
      setMovementRange((r) => ({
        ...r,
        minTilt: Math.min(r.minTilt, relTilt),
        maxTilt: Math.max(r.maxTilt, relTilt),
      }));
    }

    if (currentStep === 4 && neutral) {
      const relYaw = sy - neutral.yaw;
      setTurnDetected((d) => ({ ...d, left: d.left || relYaw > YAW_RIGHT, right: d.right || relYaw < YAW_LEFT }));
      setMovementRange((r) => ({
        ...r,
        minYaw: Math.min(r.minYaw, relYaw),
        maxYaw: Math.max(r.maxYaw, relYaw),
      }));
    }

    if (currentStep === 5 && neutral) {
      const relPitch = sp - neutral.pitch;
      setPitchDetected((d) => ({ ...d, up: d.up || relPitch < PITCH_UP, down: d.down || relPitch > PITCH_DOWN }));
      setMovementRange((r) => ({
        ...r,
        minPitch: Math.min(r.minPitch, relPitch),
        maxPitch: Math.max(r.maxPitch, relPitch),
      }));
    }

    if (currentStep === 6) {
      const mh = liveRef.current.mouthHeight;
      if (mh > MOUTH_OPEN_THRESHOLD) {
        mouthOpenFramesRef.current++;
        if (mouthOpenFramesRef.current >= MOUTH_FRAMES_TO_CONFIRM) {
          setMouthDone(true);
        }
      } else {
        mouthOpenFramesRef.current = 0;
      }
    }
  }, []);

  const { startFaceMesh } = useFaceMesh({ videoRef, onResults: handleResults });

  const trackingActive = step >= 2;
  useEffect(() => {
    if (!trackingActive) return;
    const cleanup = startFaceMesh();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [trackingActive, startFaceMesh]);

  useEffect(() => {
    if (step !== 2) {
      neutralSampleBufferRef.current = [];
      lastNeutralSampleTimeRef.current = 0;
      neutralSteadyCountRef.current = 0;
      setLive((l) => ({ ...l, neutralProgress: 0 }));
      return;
    }
    setNeutralDetected(false);
    setNeutralPosition(null);
    neutralPositionRef.current = null;
  }, [step]);

  useEffect(() => {
    neutralPositionRef.current = neutralPosition;
  }, [neutralPosition]);

  useEffect(() => {
    if (step !== 6) return;
    mouthOpenFramesRef.current = 0;
  }, [step]);

  useEffect(() => {
    if (step < 2 || step > 6) return;
    const id = setInterval(() => {
      const r = liveRef.current;
      setLive((prev) => ({
        ...prev,
        tilt: r.tilt,
        yaw: r.yaw,
        pitch: r.pitch,
        mouthHeight: r.mouthHeight,
      }));
    }, LIVE_UPDATE_MS);
    return () => clearInterval(id);
  }, [step]);

  const handleComplete = () => {
    setStep(7);
  };

  const handleSkip = () => {
    navigate("/home");
  };

  const allDirectionStepsDone = tiltDone && turnDone && pitchDone;
  const handleCalibrationDone = async () => {
    setSaveError(null);
    setSaving(true);
    const existing = profile?.calibration ?? {};
    const newCalibration = {
      ...existing,
      neutralPosition: neutralPosition ?? existing.neutralPosition,
      movementRange:
        allDirectionStepsDone
          ? movementRange
          : existing.movementRange,
      lastCalibratedAt: Date.now(),
      activationMethod: existing.activationMethod ?? "mouth",
    };
    try {
      await updateProfile((p) => ({
        ...p,
        calibration: newCalibration,
      }));
      syncCalibrationToApp(newCalibration);
      setSaving(false);
      await new Promise((r) => setTimeout(r, 0));
      if (fromSettings) {
        navigate("/settings", { replace: true });
      } else if (isFirstTime) {
        navigate("/tutorial", { replace: true });
      } else {
        navigate("/settings", { replace: true });
      }
    } catch (e) {
      setSaveError(e?.message ?? "Failed to save calibration");
      setSaving(false);
    }
  };

  if (step === 7) {
    const goToTutorial = !fromSettings && isFirstTime;
    return (
      <div className="easeL-page-bg flex min-h-screen items-center justify-center px-6 pb-16 pt-24">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {fromSettings ? "Calibration complete" : "All Set!"}
          </h1>
          <p className="text-slate-600 mb-2">
            {fromSettings
              ? "Your cursor and controls are updated everywhere—tutorial, canvas, and screener will use the new calibration."
              : "Your controls are calibrated."}
          </p>
          {!fromSettings && (
            <p className="text-slate-500 text-sm mb-8">
              You can recalibrate anytime in Settings.
            </p>
          )}
          {saveError && (
            <p className="text-red-600 text-sm mb-4">{saveError}</p>
          )}
          <button
            onClick={handleCalibrationDone}
            disabled={saving}
            className="easeL-btn-solid flex w-full items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating calibration…
              </>
            ) : goToTutorial ? (
              "Continue to Tutorial"
            ) : (
              "Back to Settings"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="easeL-page-bg min-h-screen px-6 pb-16 pt-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <p className="text-slate-600 font-medium">Step {step} of {TOTAL_STEPS}</p>
          <button
            onClick={handleSkip}
            className="flex items-center gap-2 min-h-12 px-4 rounded-2xl text-slate-600 hover:bg-white/80 transition-all"
          >
            <SkipForward className="w-5 h-5" />
            Skip
          </button>
        </div>

        <div className="flex justify-center gap-1 mb-8">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <span
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step
                  ? "bg-[var(--easeL-primary)]"
                  : s < step
                    ? "bg-[color:color-mix(in_srgb,var(--easeL-primary)_45%,white)]"
                    : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="easeL-auth-card p-8">
          {step === 1 && (
            <>
              <h2 className="mb-4 text-2xl font-bold" style={{ color: "var(--easeL-text)" }}>
                Let&apos;s Set Up Your Controls
              </h2>
              <p className="mb-8" style={{ color: "var(--easeL-text-muted)" }}>
                We&apos;ll calibrate tilt (ear toward shoulder), turn (face left/right), look up/down, and mouth open as your gesture. Each step has live feedback.
              </p>
              <div
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl"
                style={{ background: "color-mix(in srgb, var(--easeL-primary) 14%, white)" }}
              >
                <Circle className="h-12 w-12 easeL-accent-text-strong" />
              </div>
              <button
                onClick={() => setStep(2)}
                className="easeL-btn-solid w-full transition-all"
              >
                Begin Calibration
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Your Resting Position
              </h2>
              <p className="text-slate-600 mb-4">
                Sit in a comfortable position and look at the camera. When your head stays roughly in the same pose for a moment, the bar will fill from the left. Then we&apos;ll use that as your resting position for the next steps.
              </p>
              <div className="mb-4 h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                  style={{ width: `${live.neutralProgress}%`, minWidth: 0 }}
                />
              </div>
              <p className="text-sm text-slate-500 mb-6">
                {neutralDetected ? "Resting position recorded." : "Hold a steady pose…"}
              </p>
            </>
          )}

          {step >= 2 && (
            <div
              className={
                step === 2
                  ? "relative flex justify-center min-h-[240px] mb-6"
                  : "relative w-full max-w-xs aspect-video rounded-xl overflow-hidden bg-slate-800 mx-auto mb-6"
              }
            >
              <div
                className={
                  step === 2
                    ? "relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-slate-900 border-4 border-white/80 shadow-2xl"
                    : "w-full h-full rounded-xl overflow-hidden"
                }
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
              {step === 2 && neutralDetected && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium">
                  <Check className="w-5 h-5" />
                  Position detected
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!neutralDetected}
              className="easeL-btn-solid w-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Tilt Left and Right
              </h2>
              <p className="text-slate-600 mb-4">
                Tilt your head so your ear goes toward your shoulder (left, then right). Bars show live feedback.
              </p>
              <div className="space-y-4 mb-6">
                <LiveBar
                  value={neutralPosition ? -(live.tilt - neutralPosition.tilt) : -live.tilt}
                  leftLabel="Tilt left"
                  rightLabel="Tilt right"
                  detectedLeft={tiltDetected.left}
                  detectedRight={tiltDetected.right}
                />
              </div>
              <p className="text-xs text-slate-500 mb-2">Relative to your resting position (center = rest)</p>
              <div className="flex items-center justify-center gap-6 mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    tiltDetected.left ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowLeft className="w-7 h-7" />
                </div>
                <div
                  className="h-10 w-10 rounded-full border-2 bg-white"
                  style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 42%, white)" }}
                />
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    tiltDetected.right ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowRightIcon className="w-7 h-7" />
                </div>
              </div>
              <button
                onClick={() => setStep(4)}
                disabled={!tiltDone}
                className="easeL-btn-solid w-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Turn Left and Right
              </h2>
              <p className="text-slate-600 mb-4">
                Turn your face to the left, then to the right (like saying no). Bar shows live feedback.
              </p>
              <div className="space-y-4 mb-6">
                <LiveBar
                  value={neutralPosition ? -(live.yaw - neutralPosition.yaw) : -live.yaw}
                  leftLabel="Turn left"
                  rightLabel="Turn right"
                  detectedLeft={turnDetected.left}
                  detectedRight={turnDetected.right}
                />
              </div>
              <p className="text-xs text-slate-500 mb-2">Relative to your resting position (center = rest)</p>
              <div className="flex items-center justify-center gap-6 mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    turnDetected.left ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowLeft className="w-7 h-7" />
                </div>
                <div
                  className="h-10 w-10 rounded-full border-2 bg-white"
                  style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 42%, white)" }}
                />
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    turnDetected.right ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowRightIcon className="w-7 h-7" />
                </div>
              </div>
              <button
                onClick={() => setStep(5)}
                disabled={!turnDone}
                className="easeL-btn-solid w-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Look Up and Down
              </h2>
              <p className="text-slate-600 mb-4">
                Look up toward the ceiling, then down. Bar shows live feedback.
              </p>
              <div className="space-y-4 mb-6">
                <LiveBar
                  value={neutralPosition ? (live.pitch - neutralPosition.pitch) : live.pitch}
                  leftLabel="Look up"
                  rightLabel="Look down"
                  detectedLeft={pitchDetected.up}
                  detectedRight={pitchDetected.down}
                />
              </div>
              <p className="text-xs text-slate-500 mb-2">Relative to your resting position (center = rest)</p>
              <div className="flex flex-col items-center gap-6 mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    pitchDetected.up ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowUp className="w-7 h-7" />
                </div>
                <div
                  className="h-10 w-10 rounded-full border-2 bg-white"
                  style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 42%, white)" }}
                />
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    pitchDetected.down ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowDown className="w-7 h-7" />
                </div>
              </div>
              <button
                onClick={() => setStep(6)}
                disabled={!pitchDone}
                className="easeL-btn-solid w-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {step === 6 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Mouth Open (Your Gesture)
              </h2>
              <p className="text-slate-600 mb-4">
                Open your mouth to activate the cursor. The bar shows how open your mouth is in real time.
              </p>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Closed</span>
                  <span className={mouthDone ? "text-emerald-600 font-semibold" : ""}>
                    {mouthDone ? "Detected" : "Open mouth"}
                  </span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      background: "var(--easeL-primary-mid)",
                      width: `${Math.min(100, (live.mouthHeight / 0.06) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-slate-50 mb-8">
                {mouthDone ? (
                  <Check className="w-8 h-8 text-emerald-600" />
                ) : (
                  <span className="w-8 h-8 rounded-full border-2 border-slate-300" />
                )}
                <span>{mouthDone ? "Mouth open detected" : "Open your mouth…"}</span>
              </div>
              <button
                onClick={handleComplete}
                disabled={!mouthDone}
                className="easeL-btn-solid w-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                Complete Calibration
              </button>
            </>
          )}

          {step > 1 && step < 7 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="mt-4 flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
