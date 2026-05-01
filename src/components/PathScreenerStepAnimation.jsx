import React from "react";
import { Check } from "lucide-react";

/** Grayish cursor to match real app Cursor (not pen down) */
const CURSOR_COLOR = "rgba(100, 116, 139, 0.22)";
const CURSOR_BORDER = "rgba(100, 116, 139, 0.45)";
const CURSOR_SIZE = 14;
const ANIM_HEIGHT = 168;

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

/** Step 1: Cursor moves to Start button; button has press animation. */
function Step1Animation() {
  const buttonCenter = "72%";
  return (
    <div className="relative w-full flex items-center justify-center" style={{ minHeight: ANIM_HEIGHT }}>
      <div className="relative w-full max-w-sm mx-auto" style={{ minHeight: 120 }}>
        <div
          className="absolute top-1/2 min-h-[2.25rem] min-w-[5.5rem] px-5 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-lg lip-s1-btn"
          style={{
            left: buttonCenter,
            transform: "translate(-50%, -50%)",
            animation: "lip-s1-btn 4.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
          aria-hidden
        >
          Start
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 lip-s1-cursor"
          style={{
            left: "20%",
            animation: "lip-s1-cursor 4.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            willChange: "left",
          }}
        >
          <DemoCursor
            style={{
              backgroundColor: CURSOR_COLOR,
              borderColor: CURSOR_BORDER,
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes lip-s1-cursor {
          0%, 26% { left: 20%; }
          58% { left: 72%; }
          64%, 100% { left: 72%; }
        }
        @keyframes lip-s1-btn {
          0%, 54% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
          58% { transform: translate(-50%, -50%) scale(0.94); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          62%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
        }
      `}</style>
    </div>
  );
}

/** Step 2: Outer ring, inner circle grows from center (emerald). */
function Step2Animation() {
  const size = 112;
  return (
    <div className="relative w-full flex items-center justify-center" style={{ minHeight: ANIM_HEIGHT }}>
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div
          className="easeL-accent-bg relative overflow-hidden rounded-full border-4 shadow-inner"
          style={{
            borderColor: "color-mix(in srgb, var(--easeL-primary) 45%, transparent)",
            width: size,
            height: size,
          }}
          aria-hidden
        >
          <div
            className="absolute inset-0 rounded-full bg-emerald-400 origin-center"
            style={{
              animation: "lip-s2-fill 4.2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s infinite",
              willChange: "transform",
            }}
          />
        </div>
        <div
          className="absolute top-1/2 left-1/2 w-5 h-5 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none lip-s2-cursor"
          style={{
            backgroundColor: CURSOR_COLOR,
            borderColor: CURSOR_BORDER,
            animation: "lip-s2-float 4s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes lip-s2-fill {
          0% { transform: scale(0); }
          68% { transform: scale(1); }
          82%, 100% { transform: scale(0); }
        }
        @keyframes lip-s2-float {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
          25% { transform: translate(-50%, -50%) translate(6px, -4px); }
          50% { transform: translate(-50%, -50%) translate(-4px, 5px); }
          75% { transform: translate(-50%, -50%) translate(5px, 4px); }
        }
      `}</style>
    </div>
  );
}

/** Step 3: Cursor moves to each circle; circles turn green then reset. (variant="purple" for step 5 – color only.) */
function Step3Animation({ variant }) {
  const isPurple = variant === "purple";
  const positions = ["22%", "50%", "78%"];
  return (
    <div
      className={`flex flex-col items-center justify-center w-full ${isPurple ? "lip-step3-purple" : ""}`}
      style={{ minHeight: ANIM_HEIGHT, ...(isPurple && { ["--dot-bg"]: "rgb(233 213 255)", ["--dot-border"]: "rgb(147 51 234)" }) }}
    >
      <div className="relative w-full max-w-md mx-auto flex items-center justify-center" style={{ minHeight: 140 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 w-12 h-12 -translate-y-1/2"
            style={{ left: positions[i - 1], transform: "translate(-50%, -50%)" }}
            aria-hidden
          >
            <div
              className={`lip-s3-dot lip-s3-dot-${i} relative w-full h-full rounded-full border-2 flex items-center justify-center font-bold text-sm`}
              style={{
                animation: `lip-s3-dot-${i} 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
              }}
            >
              <span
                className={`lip-s3-num ${isPurple ? "text-[color:var(--easeL-accent-rose)]" : "text-[color:var(--easeL-primary)]"}`}
              >
                {i}
              </span>
              <Check className="lip-s3-check w-6 h-6 text-white absolute inset-0 m-auto opacity-0" strokeWidth={3} />
            </div>
          </div>
        ))}
        <div
          className="absolute top-1/2 -translate-y-1/2 lip-s3-cursor"
          style={{
            left: "22%",
            animation: "lip-s3-cursor 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            willChange: "left",
          }}
        >
          <DemoCursor style={{ backgroundColor: CURSOR_COLOR, borderColor: CURSOR_BORDER }} />
        </div>
      </div>
      <style>{`
        @keyframes lip-s3-cursor {
          0%, 4% { left: 22%; }
          15% { left: 50%; }
          19%, 30% { left: 50%; }
          39% { left: 78%; }
          43%, 88% { left: 78%; }
          92%, 100% { left: 22%; }
        }
        @keyframes lip-s3-dot-1 {
          0%, 5% { background-color: var(--dot-bg, rgb(199 210 254)); border-color: var(--dot-border, rgb(79 70 229)); }
          7% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          84% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          90%, 100% { background-color: var(--dot-bg, rgb(199 210 254)); border-color: var(--dot-border, rgb(79 70 229)); }
        }
        @keyframes lip-s3-dot-2 {
          0%, 17% { background-color: var(--dot-bg, rgb(199 210 254)); border-color: var(--dot-border, rgb(79 70 229)); }
          19% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          84% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          90%, 100% { background-color: var(--dot-bg, rgb(199 210 254)); border-color: var(--dot-border, rgb(79 70 229)); }
        }
        @keyframes lip-s3-dot-3 {
          0%, 37% { background-color: var(--dot-bg, rgb(199 210 254)); border-color: var(--dot-border, rgb(79 70 229)); }
          40% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          84% { background-color: rgb(16 185 129); border-color: rgb(5 150 105); }
          90%, 100% { background-color: var(--dot-bg, rgb(199 210 254)); border-color: var(--dot-border, rgb(79 70 229)); }
        }
        .lip-s3-dot-1 .lip-s3-check { animation: lip-s3-check-1 4.8s infinite; }
        .lip-s3-dot-1 .lip-s3-num { animation: lip-s3-num-1 4.8s infinite; }
        .lip-s3-dot-2 .lip-s3-check { animation: lip-s3-check-2 4.8s infinite; }
        .lip-s3-dot-2 .lip-s3-num { animation: lip-s3-num-2 4.8s infinite; }
        .lip-s3-dot-3 .lip-s3-check { animation: lip-s3-check-3 4.8s infinite; }
        .lip-s3-dot-3 .lip-s3-num { animation: lip-s3-num-3 4.8s infinite; }
        @keyframes lip-s3-check-1 { 0%, 5%, 90%, 100% { opacity: 0; } 7%, 86% { opacity: 1; } }
        @keyframes lip-s3-num-1 { 0%, 5%, 90%, 100% { opacity: 1; } 7%, 86% { opacity: 0; } }
        @keyframes lip-s3-check-2 { 0%, 17%, 90%, 100% { opacity: 0; } 19%, 86% { opacity: 1; } }
        @keyframes lip-s3-num-2 { 0%, 17%, 90%, 100% { opacity: 1; } 19%, 86% { opacity: 0; } }
        @keyframes lip-s3-check-3 { 0%, 37%, 90%, 100% { opacity: 0; } 40%, 86% { opacity: 1; } }
        @keyframes lip-s3-num-3 { 0%, 37%, 90%, 100% { opacity: 1; } 40%, 86% { opacity: 0; } }
      `}</style>
    </div>
  );
}

/** Step 4: Cursor moves left to right inside the strip. */
function Step4Animation() {
  return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: ANIM_HEIGHT }}>
      <div className="relative w-full max-w-md mx-auto flex items-center justify-center" style={{ minHeight: 120 }}>
        <div
          className="easeL-accent-bg absolute left-[8%] right-[8%] h-14 rounded-lg border-4"
          style={{
            borderColor: "color-mix(in srgb, var(--easeL-primary) 45%, transparent)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
        <div
          className="absolute top-1/2 w-6 h-6 rounded-full border-2 border-white shadow -translate-y-1/2"
          style={{
            left: "12%",
            transform: "translate(-50%, -50%)",
            backgroundColor: CURSOR_COLOR,
            borderColor: CURSOR_BORDER,
            animation: "lip-s4-cursor 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            willChange: "left",
          }}
        />
      </div>
      <style>{`
        @keyframes lip-s4-cursor {
          0% { left: 12%; }
          100% { left: 88%; }
        }
      `}</style>
    </div>
  );
}

export default function PathScreenerStepAnimation({ step }) {
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
      <Step3Animation variant="purple" />
    ) : null;

  return (
    <div
      className="easeL-accent-bg flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed py-4"
      style={{
        borderColor: "color-mix(in srgb, var(--easeL-primary) 30%, transparent)",
        minHeight: ANIM_HEIGHT + 32,
      }}
      aria-hidden
    >
      {content}
    </div>
  );
}
