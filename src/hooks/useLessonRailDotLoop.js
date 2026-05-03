import { useEffect } from "react";
import { lessonPointInsideCanvas } from "../utils/lessonCanvasViewport";

/**
 * Smooths the on-screen lesson dot and updates `CursorPositionBridge` raw +
 * canvas viewport. Calls `configureRailDot` each frame so Path 1 / Path 2 can
 * apply different visibility and sizing rules.
 */
export function useLessonRailDotLoop({
  displayCursorRef,
  cursorPosRef,
  lessonCursorBridge,
  canvasRef,
  railDotRef,
  configureRailDot,
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      displayCursorRef.current.x = window.innerWidth / 2;
      displayCursorRef.current.y = window.innerHeight / 2;
    }
  }, [displayCursorRef]);

  useEffect(() => {
    let raf;
    const smoothed = { x: displayCursorRef.current.x, y: displayCursorRef.current.y };
    const loop = () => {
      const target = displayCursorRef.current;
      smoothed.x += (target.x - smoothed.x) * 0.35;
      smoothed.y += (target.y - smoothed.y) * 0.35;
      const br = lessonCursorBridge?.current;
      if (br) {
        const raw = cursorPosRef.current;
        br.raw.x = raw.x;
        br.raw.y = raw.y;
        if (canvasRef.current) {
          const r = canvasRef.current.getBoundingClientRect();
          br.canvasViewport = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        }
        br.lessonPaused = false;
        br.showUniversalCursor = true;
      }
      const el = railDotRef.current;
      if (el) {
        el.style.left = `${smoothed.x}px`;
        el.style.top = `${smoothed.y}px`;
        const raw = cursorPosRef.current;
        const vp = br?.canvasViewport;
        const inCv = lessonPointInsideCanvas(raw.x, raw.y, vp);
        const drift = Math.hypot(smoothed.x - raw.x, smoothed.y - raw.y);
        configureRailDot?.(el, { smoothed, raw, inCv, drift, bridge: br });
      }
      raf = requestAnimationFrame(loop);
    };
    if (typeof window !== "undefined") {
      displayCursorRef.current.x = window.innerWidth / 2;
      displayCursorRef.current.y = window.innerHeight / 2;
      smoothed.x = displayCursorRef.current.x;
      smoothed.y = displayCursorRef.current.y;
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    configureRailDot,
    cursorPosRef,
    displayCursorRef,
    lessonCursorBridge,
    canvasRef,
    railDotRef,
  ]);
}
