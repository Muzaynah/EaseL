// components/StatusHUD.jsx
// Top status indicator showing pen state

import React from "react";

export default function StatusHUD({ isPenDown, strokeState = "idle", stateReason = "" }) {
  const labelByState = {
    idle: "READY",
    armed: "ARMED",
    drawing: "DRAWING",
    paused: "PAUSED",
    complete: "COMPLETE",
  };
  const active = isPenDown || strokeState === "drawing";
  return (
    <div className="absolute top-25 left-1/2 -translate-x-1/2 flex gap-4 z-[200]">
      <div
        className={`px-6 py-3 rounded-full shadow-2xl transition-all duration-300 border-2 ${
          active
            ? "bg-gradient-to-r from-green-500 to-emerald-500 border-green-600 text-white shadow-green-500/50"
            : "bg-white/90 backdrop-blur-md border-slate-300 text-slate-600"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${active ? "bg-white" : "bg-slate-400"}`} />
          <span className="font-bold text-sm tracking-wide">
            {labelByState[strokeState] ?? (active ? "DRAWING" : "READY")}
          </span>
          {stateReason ? (
            <span className={`text-[10px] font-semibold uppercase ${active ? "text-white/90" : "text-slate-500"}`}>
              {stateReason}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}