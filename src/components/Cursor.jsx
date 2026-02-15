// components/Cursor.jsx
import React, { forwardRef } from "react";

const Cursor = forwardRef(({ size, color, isPenDown, tool }, ref) => {
  return (
    <div
      ref={ref}
      className="fixed pointer-events-none rounded-full border-3 transition-all duration-75 z-[999]"
      style={{
        width: size + 8,
        height: size + 8,
        transform: "translate(-50%, -50%)",
        backgroundColor: isPenDown
          ? tool === "eraser"
            ? "rgba(255, 255, 255, 0.9)"
            : color
          : "rgba(100, 116, 139, 0.15)",
        borderColor: isPenDown ? "rgba(255, 255, 255, 0.9)" : "rgba(100, 116, 139, 0.4)",
        borderWidth: "3px",
        boxShadow: isPenDown
          ? `0 0 20px ${color}40, 0 4px 12px rgba(0, 0, 0, 0.2)`
          : "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    />
  );
});

export default React.memo(Cursor);
