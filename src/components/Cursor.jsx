
// components/Cursor.jsx
// Custom cursor indicator

import React from "react";

export default function Cursor({ position, size, color, isPenDown, tool }) {
  return (
    <>
      {/* Main cursor */}
      <div
        className="fixed pointer-events-none rounded-full border-3 transition-all duration-75 z-[999]"
        style={{
          left: position.x,
          top: position.y,
          width: size + 8,
          height: size + 8,
          transform: "translate(-50%, -50%)",
          backgroundColor: isPenDown
            ? tool === "eraser"
              ? "rgba(255, 255, 255, 0.9)"
              : color
            : "rgba(100, 116, 139, 0.15)",
          borderColor: isPenDown 
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(100, 116, 139, 0.4)",
          borderWidth: "3px",
          boxShadow: isPenDown
            ? `0 0 20px ${color}40, 0 4px 12px rgba(0, 0, 0, 0.2)`
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      />
      
      {/* Outer ring when drawing */}
      {isPenDown && (
        <div
          className="fixed pointer-events-none rounded-full border-2 animate-ping z-[998]"
          style={{
            left: position.x,
            top: position.y,
            width: size + 20,
            height: size + 20,
            transform: "translate(-50%, -50%)",
            borderColor: color,
            opacity: 0.3,
          }}
        />
      )}
      
      {/* Center dot */}
      <div
        className="fixed pointer-events-none rounded-full z-[1000]"
        style={{
          left: position.x,
          top: position.y,
          width: 4,
          height: 4,
          transform: "translate(-50%, -50%)",
          backgroundColor: isPenDown ? "white" : "rgba(100, 116, 139, 0.6)",
          boxShadow: "0 0 4px rgba(0, 0, 0, 0.3)",
        }}
      />
    </>
  );
}