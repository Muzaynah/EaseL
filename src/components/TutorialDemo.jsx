import React from "react";

/** Simple "video-style" preview: cursor moves across and clicks a button. No video file. */
const CURSOR_COLOR = "rgba(100, 116, 139, 0.22)";
const CURSOR_BORDER = "rgba(100, 116, 139, 0.45)";

function DemoCursor({ style = {} }) {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        backgroundColor: CURSOR_COLOR,
        border: "2px solid " + CURSOR_BORDER,
        boxShadow: "var(--easeL-tutorial-cursor-glow)",
        transform: "translate(-50%, -50%)",
        ...style,
      }}
    />
  );
}

export default function TutorialDemo() {
  return (
    <div
      className="relative w-full max-w-sm mx-auto rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden"
      style={{ minHeight: 140 }}
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center" style={{ minHeight: 140 }}>
        <div
          className="absolute top-1/2 min-h-[2.5rem] min-w-[5.5rem] px-5 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-lg tutorial-demo-btn"
          style={{
            left: "75%",
            transform: "translate(-50%, -50%)",
            animation: "tutorial-demo-btn 5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        >
          Click
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 tutorial-demo-cursor"
          style={{
            left: "18%",
            animation: "tutorial-demo-cursor 5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            willChange: "left",
          }}
        >
          <DemoCursor />
        </div>
      </div>
      <style>{`
        @keyframes tutorial-demo-cursor {
          0%, 22% { left: 18%; }
          50% { left: 75%; }
          56%, 100% { left: 75%; }
        }
        @keyframes tutorial-demo-btn {
          0%, 46% { transform: translate(-50%, -50%) scale(1); box-shadow: var(--easeL-tutorial-btn-shadow); }
          50% { transform: translate(-50%, -50%) scale(0.92); box-shadow: var(--easeL-tutorial-btn-shadow-pressed); }
          54%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: var(--easeL-tutorial-btn-shadow); }
        }
      `}</style>
    </div>
  );
}
