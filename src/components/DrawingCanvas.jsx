// components/DrawingCanvas.jsx
// Main drawing canvas container. canvasBg from settings: "white" | "grid" | "transparent"

import React from "react";

export default function DrawingCanvas({ canvasRef, canvasBg = "white" }) {
  const isGrid = canvasBg === "grid";
  const isTransparent = canvasBg === "transparent";

  return (
    <div
      className={`relative rounded-3xl shadow-2xl border border-white/50 w-[88%] max-w-6xl h-[80%] max-h-[900px] overflow-hidden z-10 ring-1 ring-slate-200/30 ${
        isTransparent
          ? "bg-slate-100/80 backdrop-blur-md"
          : "bg-white/95 backdrop-blur-md"
      }`}
      style={
        isGrid
          ? {
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
              backgroundColor: "#fff",
            }
          : undefined
      }
    >
      <canvas
        ref={canvasRef}
        width={2000}
        height={1500}
        className="w-full h-full"
      />
    </div>
  );
}