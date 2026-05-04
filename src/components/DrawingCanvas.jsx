// components/DrawingCanvas.jsx
import React from "react";

// Wide 16:9 landscape — more horizontal, less vertical space for drawing
const CANVAS_W = 1920;
const CANVAS_H = 1080;

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
    // Outer: fills available space, centers the canvas with padding for margin
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-100 p-4">
      {/* Inner: locked 16:9 ratio — scales proportionally, never stretches */}
      <div
        className="relative shadow-2xl"
        style={{
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          width: "100%",
          maxWidth: "min(100%, calc(80vh * (16 / 9)))",
          height: "auto",
          maxHeight: "80vh",
          ...bgStyle,
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="absolute inset-0 w-full h-full drop-shadow-lg"
        />
      </div>
    </div>
  );
}
