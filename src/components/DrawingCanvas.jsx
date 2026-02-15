// components/DrawingCanvas.jsx
// Main drawing canvas container

import React from "react";

export default function DrawingCanvas({ canvasRef }) {
  return (
    <div className="relative bg-white rounded-3xl shadow-2xl border-4 border-white/80 w-[88%] h-[80%] overflow-hidden z-10 ring-1 ring-slate-200/50">
      <canvas
        ref={canvasRef}
        width={2000}
        height={1500}
        className="w-full h-full"
      />
    </div>
  );
}