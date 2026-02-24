// components/DrawingCanvas.jsx
// Main drawing canvas container

import React from "react";

export default function DrawingCanvas({ canvasRef }) {
  return (
    <div className="relative bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 w-[88%] max-w-6xl h-[80%] max-h-[900px] overflow-hidden z-10 ring-1 ring-slate-200/30">
      <canvas
        ref={canvasRef}
        width={2000}
        height={1500}
        className="w-full h-full"
      />
    </div>
  );
}