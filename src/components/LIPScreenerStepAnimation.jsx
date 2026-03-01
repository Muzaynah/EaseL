import React from "react";
import { Check } from "lucide-react";

const CURSOR_COLOR = "#6366f1";
const CURSOR_SIZE = 14;

/** Demo cursor circle matching app Cursor (brush style) */
function DemoCursor({ className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        width: CURSOR_SIZE + 6,
        height: CURSOR_SIZE + 6,
        borderRadius: "50%",
        backgroundColor: "rgba(100, 116, 139, 0.2)",
        border: "2px solid rgba(100, 116, 139, 0.5)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        transform: "translate(-50%, -50%)",
        ...style,
      }}
    />
  );
}

/** Step 1: Cursor moves to Start button, then mouth cue, then checkmark. Loop. */
function Step1Animation() {
  const buttonCenter = "72%";
  return (
    <div className="relative w-full h-[120px] flex items-center justify-center">
      {/* Start button – center at buttonCenter so cursor lands on it */}
      <div
        className="absolute top-1/2 min-h-[2.25rem] min-w-[5.5rem] px-5 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-lg"
        style={{ left: buttonCenter, transform: "translate(-50%, -50%)" }}
        aria-hidden
      >
        Start
      </div>
      {/* Checkmark on button after "press" */}
      <div
        className="absolute top-1/2 w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white opacity-0"
        style={{
          left: buttonCenter,
          transform: "translate(-50%, -50%)",
          animation: "lip-check-in 0.3s ease-out 1.9s forwards",
        }}
        aria-hidden
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
      {/* Cursor: moves from left to center of Start button */}
      <div
        className="absolute top-1/2 -translate-y-1/2 lip-s1-cursor"
        style={{
          left: "20%",
          animation: "lip-s1-cursor 2.8s ease-in-out infinite",
          willChange: "left",
        }}
      >
        <DemoCursor
          style={{
            backgroundColor: CURSOR_COLOR,
            borderColor: "rgba(255,255,255,0.7)",
          }}
        />
        <div
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-indigo-400 bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 opacity-0 lip-s1-mouth"
          style={{
            animation: "lip-s1-mouth 0.01s 1.4s forwards, lip-scale-pulse 0.35s ease-in-out 1.4s 2",
          }}
          aria-hidden
        >
          O
        </div>
      </div>
      <style>{`
        @keyframes lip-s1-cursor {
          0%, 28% { left: 20%; }
          40% { left: 72%; }
          45%, 100% { left: 72%; }
        }
        @keyframes lip-s1-mouth { to { opacity: 1; } }
      `}</style>
    </div>
  );
}

/** Step 2: Same as real screener – outer ring, inner circle grows from center (emerald). */
function Step2Animation() {
  const size = 96;
  return (
    <div className="relative w-full h-[120px] flex items-center justify-center">
      <div
        className="relative rounded-full border-4 border-indigo-500 bg-indigo-100/60 shadow-inner"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {/* Inner circle grows from center – same as LIPScreener step 2 */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400"
          style={{
            width: size,
            height: size,
            animation: "lip-s2-fill 4s ease-in-out 0.3s infinite",
            willChange: "transform",
          }}
        />
      </div>
      {/* Cursor dot in center */}
      <div
        className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2"
        style={{ backgroundColor: CURSOR_COLOR }}
      />
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white opacity-0"
        style={{ animation: "lip-check-in 0.3s ease-out 2.7s forwards" }}
      >
        <Check className="w-4 h-4" strokeWidth={3} />
      </div>
      <style>{`
        @keyframes lip-s2-fill {
          0% { transform: translate(-50%, -50%) scale(0); }
          70% { transform: translate(-50%, -50%) scale(1); }
          85%, 100% { transform: translate(-50%, -50%) scale(0); }
        }
      `}</style>
    </div>
  );
}

/** Step 3: Cursor moves to each circle; when cursor is on circle, it turns green. */
function Step3Animation() {
  const positions = ["22%", "50%", "78%"];
  return (
    <div className="relative w-full h-[120px] flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="lip-s3-dot absolute top-1/2 w-11 h-11 rounded-full border-2 border-indigo-600 bg-indigo-200 flex items-center justify-center text-indigo-900 font-bold text-sm -translate-y-1/2 transition-colors duration-200"
          style={{
            left: positions[i - 1],
            transform: "translate(-50%, -50%)",
            animation: `lip-s3-dot 4.5s ease-in-out infinite`,
            animationDelay: `${(i - 1) * 1.2}s`,
          }}
          aria-hidden
        >
          <span className="lip-s3-num">{i}</span>
          <Check className="lip-s3-check w-5 h-5 text-white absolute opacity-0" strokeWidth={3} />
        </div>
      ))}
      <div
        className="absolute top-1/2 -translate-y-1/2 lip-s3-cursor"
        style={{
          left: "22%",
          animation: "lip-s3-cursor 4.5s ease-in-out infinite",
          willChange: "left",
        }}
      >
        <DemoCursor style={{ backgroundColor: CURSOR_COLOR, borderColor: "rgba(255,255,255,0.7)" }} />
      </div>
      <style>{`
        @keyframes lip-s3-cursor {
          0%, 8% { left: 22%; }
          20% { left: 50%; }
          25%, 35% { left: 50%; }
          45% { left: 78%; }
          50%, 100% { left: 78%; }
        }
        @keyframes lip-s3-dot {
          0%, 12% { background-color: rgb(199 210 254); border-color: rgb(79 70 229); }
          16% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          20%, 100% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
        }
        .lip-s3-dot:nth-child(1) .lip-s3-check { animation: lip-show 0.2s 0.9s forwards; }
        .lip-s3-dot:nth-child(1) .lip-s3-num { animation: lip-hide 0.01s 0.9s forwards; }
        .lip-s3-dot:nth-child(2) .lip-s3-check { animation: lip-show 0.2s 2s forwards; }
        .lip-s3-dot:nth-child(2) .lip-s3-num { animation: lip-hide 0.01s 2s forwards; }
        .lip-s3-dot:nth-child(3) .lip-s3-check { animation: lip-show 0.2s 3.2s forwards; }
        .lip-s3-dot:nth-child(3) .lip-s3-num { animation: lip-hide 0.01s 3.2s forwards; }
        @keyframes lip-show { to { opacity: 1; } }
        @keyframes lip-hide { to { opacity: 0; } }
      `}</style>
    </div>
  );
}

/** Step 4: Cursor moves smoothly left to right inside the strip. */
function Step4Animation() {
  return (
    <div className="relative w-full h-[120px] flex items-center justify-center">
      <div
        className="absolute left-[8%] right-[8%] h-12 rounded-lg border-4 border-indigo-500 bg-indigo-100/60"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />
      <div
        className="absolute top-1/2 w-5 h-5 rounded-full border-2 border-white shadow -translate-y-1/2"
        style={{
          left: "12%",
          transform: "translate(-50%, -50%)",
          backgroundColor: CURSOR_COLOR,
          animation: "lip-s4-cursor 3.2s ease-in-out infinite",
          willChange: "left",
        }}
      />
      <style>{`
        @keyframes lip-s4-cursor {
          0% { left: 12%; }
          100% { left: 88%; }
        }
      `}</style>
    </div>
  );
}

/** Step 5: Round 1 – select 3 circles; Round 2 – same 3 again. */
function Step5Animation() {
  const positions = ["22%", "50%", "78%"];
  return (
    <div className="relative w-full h-[120px] flex flex-col items-center justify-center">
      <span
        className="text-xs font-bold text-purple-600 mb-1"
        style={{ animation: "lip-s5-label 5.5s ease-in-out infinite" }}
      >
        Round 1
      </span>
      <div className="relative w-full flex-1 flex items-center justify-center min-h-[4rem]">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="lip-s5-dot absolute top-1/2 w-10 h-10 rounded-full border-2 border-purple-600 bg-purple-200 flex items-center justify-center text-purple-900 font-bold text-sm -translate-y-1/2"
            style={{
              left: positions[i - 1],
              transform: "translate(-50%, -50%)",
              animation: "lip-s5-dot 5.5s ease-in-out infinite",
              animationDelay: `${(i - 1) * 0.45}s`,
            }}
          >
            <span className="lip-s5-num">{i}</span>
            <Check className="lip-s5-check w-4 h-4 text-white absolute opacity-0" strokeWidth={3} />
          </div>
        ))}
        <div
          className="lip-s5-cursor absolute top-1/2 -translate-y-1/2"
          style={{
            left: "22%",
            animation: "lip-s5-cursor 5.5s ease-in-out infinite",
            willChange: "left",
          }}
        >
          <DemoCursor style={{ backgroundColor: CURSOR_COLOR, borderColor: "rgba(255,255,255,0.7)" }} />
        </div>
      </div>
      <span
        className="text-xs font-bold text-purple-600 mt-1"
        style={{ animation: "lip-s5-label 5.5s ease-in-out infinite", animationDelay: "2.75s" }}
      >
        Round 2
      </span>
      <style>{`
        @keyframes lip-s5-cursor {
          0%, 4% { left: 22%; }
          16% { left: 50%; }
          20%, 30% { left: 50%; }
          40% { left: 78%; }
          44%, 54% { left: 78%; }
          58%, 62% { left: 22%; }
          72% { left: 50%; }
          76%, 86% { left: 50%; }
          94% { left: 78%; }
          100% { left: 78%; }
        }
        @keyframes lip-s5-dot {
          0%, 8% { background-color: rgb(233 213 255); border-color: rgb(147 51 234); }
          12% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          16%, 48% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          52%, 60% { background-color: rgb(233 213 255); border-color: rgb(147 51 234); }
          64% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          68%, 100% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
        }
        @keyframes lip-s5-label {
          0%, 22% { opacity: 1; }
          28%, 48% { opacity: 0.25; }
          52%, 72% { opacity: 1; }
          78%, 100% { opacity: 0.25; }
        }
        .lip-s5-dot:nth-child(1) .lip-s5-check { animation: lip-show 0.2s 0.7s forwards, lip-hide 0.01s 2.75s forwards, lip-show 0.2s 3.4s forwards; }
        .lip-s5-dot:nth-child(1) .lip-s5-num { animation: lip-hide 0.01s 0.7s forwards, lip-show 0.01s 2.75s forwards, lip-hide 0.01s 3.4s forwards; }
        .lip-s5-dot:nth-child(2) .lip-s5-check { animation: lip-show 0.2s 1.15s forwards, lip-hide 0.01s 2.75s forwards, lip-show 0.2s 3.85s forwards; }
        .lip-s5-dot:nth-child(2) .lip-s5-num { animation: lip-hide 0.01s 1.15s forwards, lip-show 0.01s 2.75s forwards, lip-hide 0.01s 3.85s forwards; }
        .lip-s5-dot:nth-child(3) .lip-s5-check { animation: lip-show 0.2s 1.6s forwards, lip-hide 0.01s 2.75s forwards, lip-show 0.2s 4.3s forwards; }
        .lip-s5-dot:nth-child(3) .lip-s5-num { animation: lip-hide 0.01s 1.6s forwards, lip-show 0.01s 2.75s forwards, lip-hide 0.01s 4.3s forwards; }
      `}</style>
    </div>
  );
}

export default function LIPScreenerStepAnimation({ step }) {
  const content =
    step === 1 ? (
      <Step1Animation />
    ) : step === 2 ? (
      <Step2Animation />
    ) : step === 3 ? (
      <Step3Animation />
    ) : step === 4 ? (
      <Step4Animation />
    ) : step === 5 ? (
      <Step5Animation />
    ) : null;

  return (
    <div
      className="w-full min-h-[120px] rounded-2xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      {content}
    </div>
  );
}
