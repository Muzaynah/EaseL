// components/DrawingCanvas.jsx
import React from "react";

export default function DrawingCanvas({ canvasRef, canvasBg = "white" }) {
  const isGrid = canvasBg === "grid";
  const isTransparent = canvasBg === "transparent";

  return (
    <div
      className={`w-full h-full ${isTransparent ? "bg-slate-50/80" : "bg-white"}`}
      style={
        isGrid
          ? {
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
              backgroundColor: isTransparent ? "rgba(245,245,245,0.8)" : "#ffffff",
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
