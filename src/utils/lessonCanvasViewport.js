/**
 * Shared helpers for mapping lesson canvas coordinates ↔ screen and hit-testing
 * the camera preview / canvas bounds (used by Path 1 + Path 2 rail dot UI).
 */

export function lessonPointInsideCanvas(px, py, vp) {
  if (!vp) return false;
  return px >= vp.left && px <= vp.right && py >= vp.top && py <= vp.bottom;
}

export function createCanvasToScreen(canvasRef, canvasWidth, canvasHeight) {
  return function canvasToScreen(cx, cy) {
    const el = canvasRef.current;
    if (!el) return { x: cx, y: cy };
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + (cx / canvasWidth) * rect.width,
      y: rect.top + (cy / canvasHeight) * rect.height,
    };
  };
}
