// components/DrawingCanvas.jsx
import React from "react";

// 3:2 landscape — more horizontal space; composition preserved across sidebar states
const CANVAS_W = 1800;
const CANVAS_H = 1200;

export default function DrawingCanvas({ canvasRef, canvasBg = "white" }) {
  const isGrid = canvasBg === "grid";
  const isTransparent = canvasBg === "transparent";

  const bgStyle = isGrid
    ? {
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
        backgroundColor: "#ffffff",
      }
    : { backgroundColor: isTransparent ? "rgba(245,245,245,0.8)" : "#ffffff" };

  return (
    // Outer: fills available space, centers the canvas
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-100">
      {/* Inner: locked 4:3 ratio — grows to fit but never distorts */}
      <div
        className="relative shadow-lg"
        style={{
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "100%",
          ...bgStyle,
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}
