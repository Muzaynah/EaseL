import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SkipForward, ArrowRight, Check, Circle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight as ArrowRightIcon } from "lucide-react";
const TOTAL_STEPS = 4;

export default function Calibration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [neutralDetected, setNeutralDetected] = useState(false);
  const [directionsDetected, setDirectionsDetected] = useState({ up: false, down: false, left: false, right: false });
  const [gesturesDone, setGesturesDone] = useState({ mouth: false, nod: false });
  const videoRef = useRef(null);

  const allDirectionsDone =
    directionsDetected.up && directionsDetected.down && directionsDetected.left && directionsDetected.right;
  const allGesturesDone = gesturesDone.mouth && gesturesDone.nod;

  // Start camera for step 2
  useEffect(() => {
    if (step !== 2) return;
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera not available for calibration:", err);
        setNeutralDetected(true);
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [step]);

  // Mock: detect neutral after 2s on step 2
  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => setNeutralDetected(true), 2000);
    return () => clearTimeout(t);
  }, [step]);

  const handleComplete = () => {
    setStep(5); // success screen
  };

  const handleSkip = () => {
    navigate("/home");
  };

  if (step === 5) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-6 pt-24 pb-16">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">All Set!</h1>
          <p className="text-slate-600 mb-2">Your controls are calibrated.</p>
          <p className="text-slate-500 text-sm mb-8">You can recalibrate anytime in Settings.</p>
          <button
            onClick={() => navigate("/canvas")}
            className="w-full min-h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
          >
            Start Drawing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
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

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s === step ? "bg-indigo-500" : s < step ? "bg-indigo-300" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50">
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Let&apos;s Set Up Your Controls
              </h2>
              <p className="text-slate-600 mb-8">
                We&apos;ll calibrate EaseL to match your movement range and abilities. This takes about 2 minutes.
              </p>
              <div className="w-24 h-24 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center mb-8">
                <Circle className="w-12 h-12 text-indigo-500" />
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full min-h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
              >
                Begin Calibration
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Find Your Comfortable Position
              </h2>
              <p className="text-slate-600 mb-6">
                Position yourself comfortably and look straight at the camera.
              </p>
              <div className="relative flex justify-center min-h-[280px] mb-6">
                <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-slate-900 border-4 border-white/80 shadow-2xl">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    autoPlay
                    muted
                    playsInline
                  />
                </div>
                {neutralDetected && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium">
                    <Check className="w-5 h-5" />
                    Position detected
                  </div>
                )}
              </div>
              <button
                onClick={() => setStep(3)}
                disabled={!neutralDetected}
                className="w-full min-h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Test Your Movement Range
              </h2>
              <p className="text-slate-600 mb-8">
                Move your head slowly in all directions.
              </p>
              <div className="flex flex-col items-center gap-6 mb-8">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    directionsDetected.up ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowUp className="w-8 h-8" />
                </div>
                <div className="flex items-center gap-6">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      directionsDetected.left ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <ArrowLeft className="w-8 h-8" />
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-400 bg-white" />
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      directionsDetected.right ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <ArrowRightIcon className="w-8 h-8" />
                  </div>
                </div>
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    directionsDetected.down ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <ArrowDown className="w-8 h-8" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDirectionsDetected({ up: true, down: true, left: true, right: true });
                }}
                className="w-full min-h-12 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 mb-3"
              >
                Simulate all detected
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!allDirectionsDone}
                className="w-full min-h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Test Your Gestures
              </h2>
              <p className="text-slate-600 mb-8">
                Perform each gesture when ready.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                  <span>Open your mouth</span>
                  {gesturesDone.mouth ? (
                    <Check className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <span className="w-6 h-6 rounded-full border-2 border-slate-300" />
                  )}
                </li>
                <li className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                  <span>Nod your head</span>
                  {gesturesDone.nod ? (
                    <Check className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <span className="w-6 h-6 rounded-full border-2 border-slate-300" />
                  )}
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setGesturesDone({ mouth: true, nod: true })}
                className="w-full min-h-12 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 mb-3"
              >
                Simulate gestures detected
              </button>
              <button
                onClick={handleComplete}
                disabled={!allGesturesDone}
                className="w-full min-h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Calibration
              </button>
            </>
          )}

          {step > 1 && step < 5 && (
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
