import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useGestureControl } from "../hooks/useGestureControl";
import { useAppState } from "../context/AppStateContext";
import { playSuccessBeep, speakInstruction, stopSpeech } from "../utils/screenerAudio";
import { updatePositionTilt, createTiltState } from "../utils/cursorMappings";
import Cursor from "../components/Cursor";
import { Check, Volume2 } from "lucide-react";

export default function LIPScreener() {
  const navigate = useNavigate();
  const { setProfile } = useAppState();
  const videoRef = useRef(null);
  const cursorPosRef = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 400,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
  });
  const cursorRef = useRef(null);
  const tiltStateRef = useRef(createTiltState());
  const buttonRefs = useRef({});
  const [step, setStep] = useState(1);
  const [metrics, setMetrics] = useState({
    s1ReactionMs: null,
    s2HoldMs: null,
    s3Hits: 0,
    s3Total: 5,
    s4TimeMs: null,
    s4Deviations: 0,
    s5Round1Ms: null,
    s5Round2Ms: null,
  });
  const step1ShownAt = useRef(null);
  const s2AccumRef = useRef(0);
  const s2LastEnterRef = useRef(null);
  const [s2Inside, setS2Inside] = useState(false);
  const [s2Progress, setS2Progress] = useState(0);
  const [s3Selected, setS3Selected] = useState(() => new Set());
  const s4StartRef = useRef(null);
  const [s4Done, setS4Done] = useState(false);
  const [s5Phase, setS5Phase] = useState(1);
  const [s5Round1Selected, setS5Round1Selected] = useState(() => new Set());
  const [s5Round2Selected, setS5Round2Selected] = useState(() => new Set());
  const [s5Round1Start, setS5Round1Start] = useState(null);
  const [s5Round2Start, setS5Round2Start] = useState(null);
  const [finished, setFinished] = useState(false);
  const [instructionAcknowledged, setInstructionAcknowledged] = useState(false);
  const [dialogFading, setDialogFading] = useState(false);
  const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 400;
  const centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 300;
  const zoneR = 100;
  const corridorY = centerY;
  const corridorH = 160;
  const corridorLeft = 80;
  const corridorRight = typeof window !== "undefined" ? window.innerWidth - 80 : 720;

  const STEP_INSTRUCTIONS = {
    1: "Put the cursor on the green Start button. Open your mouth or click to press it.",
    2: "Keep the cursor inside the circle for 3 seconds.",
    3: "Select each circle. Put the cursor on a circle, then open your mouth or click.",
    4: "Move the cursor from the left to the right. Stay inside the strip.",
    5: "Select the 3 circles. Round one, then round two.",
  };

  const processLandmarksRef = useRef(() => {});
  const handleResults = useCallback((results) => {
    const landmarks = results.multiFaceLandmarks?.[0];
    updatePositionTilt(landmarks, cursorPosRef, tiltStateRef);
  }, []);

  const handleActivate = useCallback((btnId) => {
    if (step === 1 && step1ShownAt.current) {
      playSuccessBeep();
      setMetrics((m) => ({ ...m, s1ReactionMs: Date.now() - step1ShownAt.current }));
      setStep(2);
      return;
    }
    if (step === 3 && btnId?.startsWith("s3-")) {
      const num = parseInt(btnId.replace("s3-", ""), 10);
      if (!Number.isNaN(num)) {
        playSuccessBeep();
        setS3Selected((prev) => {
          const next = new Set(prev);
          next.add(num);
          return next;
        });
      }
      return;
    }
    if (step === 5 && btnId?.startsWith("s5-")) {
      const num = parseInt(btnId.replace("s5-", ""), 10);
      if (!Number.isNaN(num)) {
        playSuccessBeep();
        if (s5Phase === 1) {
          setS5Round1Selected((prev) => {
            const next = new Set(prev);
            next.add(num);
            return next;
          });
        } else {
          setS5Round2Selected((prev) => {
            const next = new Set(prev);
            next.add(num);
            return next;
          });
        }
      }
      return;
    }
  }, [step, s5Phase]);

  const { processLandmarks } = useGestureControl({
    onPenToggle: () => {},
    onButtonHover: () => {},
    onButtonClick: handleActivate,
    buttonRefs,
    cursorPosRef,
    mouthOpenThreshold: 0.022,
    framesToConfirm: 1,
    cooldownMs: 200,
  });
  processLandmarksRef.current = processLandmarks;

  const onFaceResults = useCallback((results) => {
    handleResults(results);
    const landmarks = results.multiFaceLandmarks?.[0];
    if (landmarks) processLandmarksRef.current(landmarks, false);
  }, [handleResults]);

  const { startFaceMesh } = useFaceMesh({ videoRef, onResults: onFaceResults });

  useEffect(() => {
    if (instructionAcknowledged && step === 1) step1ShownAt.current = Date.now();
  }, [instructionAcknowledged, step]);

  useEffect(() => {
    setInstructionAcknowledged(false);
    setDialogFading(false);
  }, [step]);

  const fadeTimeoutRef = useRef(null);
  useEffect(() => {
    const text = STEP_INSTRUCTIONS[step];
    if (!text) return;
    speakInstruction(text, {
      onEnd: () => {
        setDialogFading(true);
        fadeTimeoutRef.current = setTimeout(() => setInstructionAcknowledged(true), 450);
      },
    });
    return () => {
      stopSpeech();
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [step]);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  useEffect(() => {
    if (step === 4 && instructionAcknowledged) {
      cursorPosRef.current.x = corridorLeft + 24;
      cursorPosRef.current.y = corridorY;
    }
  }, [step, instructionAcknowledged, corridorLeft, corridorY]);

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
    if (step !== 2) return;
    s2AccumRef.current = 0;
    s2LastEnterRef.current = null;
    setS2Progress(0);
  }, [step]);

  useEffect(() => {
    if (step !== 2 || !instructionAcknowledged) return;
    const id = setInterval(() => {
      const x = cursorPosRef.current.x;
      const y = cursorPosRef.current.y;
      const dist = Math.hypot(x - centerX, y - centerY);
      const inside = dist <= zoneR;
      const now = Date.now();
      if (inside) {
        if (s2LastEnterRef.current === null) s2LastEnterRef.current = now;
        const elapsed = s2AccumRef.current + (now - s2LastEnterRef.current);
        s2AccumRef.current = elapsed;
        s2LastEnterRef.current = now;
        setS2Progress(Math.min(1, elapsed / 3000));
        if (elapsed >= 3000) {
          playSuccessBeep();
          setMetrics((m) => ({ ...m, s2HoldMs: Math.round(elapsed) }));
          setStep(3);
        }
        setS2Inside(true);
      } else {
        s2AccumRef.current = 0;
        s2LastEnterRef.current = null;
        setS2Inside(false);
        setS2Progress(0);
      }
    }, 50);
    return () => clearInterval(id);
  }, [step, instructionAcknowledged, centerX]);

  useEffect(() => {
    if (step === 3 && s3Selected.size >= 5) {
      setMetrics((m) => ({ ...m, s3Hits: 5 }));
      setStep(4);
    }
  }, [step, s3Selected.size]);

  useEffect(() => {
    if (instructionAcknowledged && step === 4) s4StartRef.current = Date.now();
  }, [instructionAcknowledged, step]);

  // Keep cursor responsive in steps 3–5: reset tilt smoothing when task view is shown for that step
  useEffect(() => {
    if (instructionAcknowledged && (step === 3 || step === 4 || step === 5)) {
      tiltStateRef.current = createTiltState();
    }
  }, [instructionAcknowledged, step]);

  useEffect(() => {
    if (step !== 4 || !instructionAcknowledged || s4Done) return;
    const id = setInterval(() => {
      if (s4Done) return;
      const x = cursorPosRef.current.x;
      const y = cursorPosRef.current.y;
      if (x >= corridorRight && s4StartRef.current) {
        setMetrics((m) => ({ ...m, s4TimeMs: Date.now() - s4StartRef.current, s4Deviations: m.s4Deviations }));
        setS4Done(true);
        setStep(5);
      } else {
        const out = Math.abs(y - corridorY) > corridorH / 2;
        if (out) setMetrics((m) => ({ ...m, s4Deviations: m.s4Deviations + 1 }));
      }
    }, 200);
    return () => clearInterval(id);
  }, [step, instructionAcknowledged, s4Done, corridorY, corridorH]);

  useEffect(() => {
    if (step === 5 && s5Phase === 1 && s5Round1Selected.size === 0 && !s5Round1Start) setS5Round1Start(Date.now());
    if (step === 5 && s5Phase === 1 && s5Round1Selected.size >= 3) {
      const t1 = Date.now() - s5Round1Start;
      setMetrics((m) => ({ ...m, s5Round1Ms: t1 }));
      setS5Phase(2);
      setS5Round2Selected(new Set());
      setS5Round2Start(Date.now());
    }
    if (step === 5 && s5Phase === 2 && s5Round2Selected.size >= 3) {
      const t2 = Date.now() - s5Round2Start;
      setMetrics((m) => {
        const next = { ...m, s5Round2Ms: t2 };
        const accuracy = (next.s3Total > 0 ? (next.s3Hits || 0) / next.s3Total : 0);
        const fatigue = next.s5Round1Ms > 0 && next.s5Round2Ms != null ? next.s5Round2Ms / next.s5Round1Ms : 1;
        const lipMode = accuracy < 0.8 || fatigue > 1.4 ? 1 : 2;
        setProfile((p) => ({ ...p, lipMode, screenerMetrics: { s1ReactionMs: next.s1ReactionMs, s2HoldMs: next.s2HoldMs, s3Hits: next.s3Hits, s3Total: next.s3Total, s4TimeMs: next.s4TimeMs, s4Deviations: next.s4Deviations, s5Round1Ms: next.s5Round1Ms, s5Round2Ms: next.s5Round2Ms } }));
        return next;
      });
      setFinished(true);
    }
  }, [step, s5Phase, s5Round1Selected.size, s5Round2Selected.size, s5Round1Start, s5Round2Start, setProfile]);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (cursorRef.current) {
        cursorRef.current.style.left = cursorPosRef.current.x + "px";
        cursorRef.current.style.top = cursorPosRef.current.y + "px";
      }
    };
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);


  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 px-6">
        <div className="max-w-lg w-full bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/50 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Screener complete</h1>
          <p className="text-xl font-bold text-slate-700 mb-8">Your control mode has been set. Go to Home or Lessons.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/home", { replace: true })}
              className="min-h-14 px-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-indigo-300"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/lessons", { replace: true })}
              className="min-h-14 px-8 rounded-2xl border-4 border-indigo-500 text-indigo-700 font-bold text-lg hover:bg-indigo-50 hover:border-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              Lessons
            </button>
          </div>
        </div>
      </div>
    );
  }

  const playInstructionAgain = useCallback(() => {
    const text = STEP_INSTRUCTIONS[step];
    if (text) speakInstruction(text);
  }, [step]);

  const listenAgainBtn = (
    <button
      type="button"
      onClick={playInstructionAgain}
      className="inline-flex items-center gap-2 text-xl font-bold text-slate-700 py-3 px-6 rounded-2xl border-2 border-transparent hover:border-indigo-300 hover:text-indigo-600 hover:bg-white/70 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <Volume2 className="w-7 h-7" aria-hidden /> Listen again
    </button>
  );

  const instructionOverlay = !instructionAcknowledged && (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm pt-24 pb-8 px-6 transition-opacity duration-500 ${
        dialogFading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={instructionAcknowledged}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl border-2 border-indigo-100 max-w-2xl w-full p-10 md:p-12 flex flex-col items-center gap-8 transition-opacity duration-500 ${
          dialogFading ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-2xl font-bold text-indigo-600">Step {step} of 5</p>
        <p className="text-3xl md:text-4xl font-bold text-slate-800 leading-snug text-center">
          {STEP_INSTRUCTIONS[step]}
        </p>
        <div className="w-full min-h-[120px] rounded-2xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center">
          <span className="text-slate-500 font-medium">Animation placeholder</span>
        </div>
      </div>
    </div>
  );

  const content = () => {
    if (step === 1) {
      return (
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          <button
            type="button"
            ref={(el) => { buttonRefs.current["s1-btn"] = el; }}
            onClick={() => handleActivate("s1-btn")}
            className="min-h-[4.5rem] min-w-[14rem] px-12 rounded-2xl bg-emerald-500 text-white font-bold text-2xl shadow-xl hover:bg-emerald-600 hover:scale-[1.03] active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300"
          >
            Start
          </button>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          <div className="relative flex items-center justify-center" style={{ width: zoneR * 2, height: zoneR * 2 }}>
            <div
              className="absolute inset-0 rounded-full border-4 border-indigo-500 bg-indigo-100/60 shadow-inner"
              style={{ width: zoneR * 2, height: zoneR * 2 }}
            />
            <div
              className="absolute left-1/2 top-1/2 rounded-full bg-emerald-400 transition-all duration-100 ease-out -translate-x-1/2 -translate-y-1/2"
              style={{
                width: zoneR * 2 * s2Progress,
                height: zoneR * 2 * s2Progress,
                maxWidth: zoneR * 2,
                maxHeight: zoneR * 2,
              }}
            />
          </div>
        </div>
      );
    }
    if (step === 3) {
      const targets = [1, 2, 3, 4, 5];
      return (
        <div className="text-center w-full max-w-4xl mx-auto flex flex-col items-center gap-10">
          <p className="text-2xl md:text-3xl font-bold text-slate-600">{s3Selected.size} of 5 selected</p>
          <div className="flex justify-center gap-12 flex-wrap">
            {targets.map((i) => {
              const selected = s3Selected.has(i);
              return (
                <button
                  key={i}
                  ref={(el) => { buttonRefs.current[`s3-${i}`] = el; }}
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-4 font-bold text-2xl flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-offset-2 ${
                    selected ? "bg-emerald-500 border-emerald-700 text-white scale-105" : "bg-indigo-200 border-indigo-600 text-indigo-900 hover:bg-indigo-300 hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {selected ? <Check className="w-12 h-12 md:w-14 md:h-14" /> : i}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (step === 4) {
      return (
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center">
          <div
            className="absolute left-0 right-0 border-4 border-indigo-500 bg-indigo-100/50 shadow-lg rounded-lg"
            style={{
              top: corridorY - corridorH / 2,
              height: corridorH,
              left: corridorLeft,
              width: corridorRight - corridorLeft,
            }}
          />
        </div>
      );
    }
    if (step === 5) {
      const targets = [1, 2, 3];
      const s5Selected = s5Phase === 1 ? s5Round1Selected : s5Round2Selected;
      return (
        <div className="text-center w-full max-w-4xl mx-auto flex flex-col items-center gap-10">
          <p className="text-2xl md:text-3xl font-bold text-slate-600">Round {s5Phase}: {s5Selected.size} of 3 selected</p>
          <div className="flex justify-center gap-16">
            {targets.map((i) => {
              const selected = s5Selected.has(i);
              return (
                <button
                  key={i}
                  ref={(el) => { buttonRefs.current[`s5-${i}`] = el; }}
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-4 font-bold text-2xl flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 ${
                    selected ? "bg-emerald-500 border-emerald-700 text-white scale-105" : "bg-purple-200 border-purple-600 text-purple-900 hover:bg-purple-300 hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {selected ? <Check className="w-12 h-12 md:w-14 md:h-14" /> : i}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-20 flex flex-col overflow-hidden relative">
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <header className="shrink-0 pt-8 pb-8 px-6 text-center border-b border-indigo-100/80 bg-white/40">
        <p className="text-2xl font-bold text-indigo-600 mb-4">Step {step} of 5</p>
        <p className="text-3xl md:text-4xl lg:text-[2.25rem] font-bold text-slate-800 leading-snug max-w-4xl mx-auto">
          {STEP_INSTRUCTIONS[step]}
        </p>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center min-h-0 pt-10 pb-12 px-6">
        <div className="w-full flex flex-col items-center justify-center">
          {content()}
        </div>
      </main>
      <footer className="shrink-0 py-6 px-6 flex justify-center border-t border-indigo-100/80 bg-white/30">
        {listenAgainBtn}
      </footer>
      <Cursor ref={cursorRef} size={24} color="#6366f1" isPenDown={false} tool="brush" />
      {instructionOverlay}
    </div>
  );
}
