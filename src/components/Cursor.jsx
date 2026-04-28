// components/Cursor.jsx
import React, { forwardRef } from "react";

const Cursor = forwardRef(
  (
    {
      size,
      color,
      isPenDown,
      tool,
      left,
      top,
      variant = "default",
      /** When true, fill/glow are driven by parent (e.g. rAF) so they match canvas stroke. */
      liveRefColor = false,
    },
    ref
  ) => {
  const isLesson = variant === "lesson";
  const pad = isLesson ? 3 : 8;
  const positionStyle =
    left != null && top != null
      ? { left: typeof left === "number" ? `${left}px` : left, top: typeof top === "number" ? `${top}px` : top }
      : {};
  const refDriven = liveRefColor && isPenDown && tool !== "eraser";
  return (
    <div
      ref={ref}
      className={`fixed pointer-events-none rounded-full z-[999] ${
        isLesson ? "border-2" : "border-3"
      }`}
      style={{
        ...positionStyle,
        width: size + pad,
        height: size + pad,
        transform: "translate(-50%, -50%)",
        ...(refDriven
          ? {
              backgroundColor: "rgba(67, 56, 202, 0.35)",
              boxShadow: "none",
            }
          : {
              backgroundColor: isPenDown
                ? tool === "eraser"
                  ? "rgba(255, 255, 255, 0.9)"
                  : color
                : "rgba(100, 116, 139, 0.15)",
              boxShadow: isPenDown
                ? isLesson
                  ? `0 0 6px ${color}35, 0 2px 6px rgba(0,0,0,0.12)`
                  : `0 0 20px ${color}40, 0 4px 12px rgba(0, 0, 0, 0.2)`
                : "0 2px 8px rgba(0, 0, 0, 0.1)",
            }),
        borderColor: isPenDown
          ? isLesson
            ? "rgba(255, 255, 255, 0.75)"
            : "rgba(255, 255, 255, 0.9)"
          : "rgba(100, 116, 139, 0.4)",
        borderWidth: isLesson ? "2px" : "3px",
      }}
    />
  );
  }
);

export default React.memo(Cursor);