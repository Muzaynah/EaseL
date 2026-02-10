// components/DrawingCanvas.jsx
// Main drawing canvas container

import React from "react";

export default function DrawingCanvas({ canvasRef }) {
  return (
    <div className="relative bg-white rounded-3xl shadow-2xl border-4 border-white/80 w-[88%] h-[72%] overflow-hidden z-10 ring-1 ring-slate-200/50">
      <canvas
        ref={canvasRef}
        width={2000}
        height={1500}
        className="w-full h-full"
      />
      {/* Corner decorations */}
      <div className="absolute top-3 left-3 w-8 h-8 border-l-2 border-t-2 border-indigo-200 rounded-tl-lg" />
      <div className="absolute top-3 right-3 w-8 h-8 border-r-2 border-t-2 border-indigo-200 rounded-tr-lg" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-l-2 border-b-2 border-indigo-200 rounded-bl-lg" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-indigo-200 rounded-br-lg" />
    </div>
  );
}