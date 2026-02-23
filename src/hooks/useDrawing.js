// hooks/useDrawing.js
import { useRef, useCallback, useState } from "react";
import { drawSegment, floodFill } from "../utils/canvasUtils";

const DEBUG = typeof window === "undefined" || window.EaseL_DEBUG !== false;

export function useDrawing({ canvasRef, brushSize, brushColor, tool }) {
  const pointsRef = useRef([]);
  const history = useRef([]);
  const historyStep = useRef(-1);
  const isDrawing = useRef(false);
  /** End point of the last drawn segment — keeps incremental strokes connected */
  const lastDrawnEndRef = useRef(null);

  // Always-current values (updated every render) so callbacks never see stale tool/color
  const latestBrushColor = useRef(brushColor);
  const latestTool = useRef(tool);
  const latestBrushSize = useRef(brushSize);
  latestBrushColor.current = brushColor;
  latestTool.current = tool;
  latestBrushSize.current = brushSize;

  // Store the color/tool/size for the current stroke (set when stroke starts)
  const currentStrokeColor = useRef(brushColor);
  const currentStrokeTool = useRef(tool);
  const currentStrokeSize = useRef(brushSize);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /** Pending deferred save: cancel on undo so we don't push the stroke we're undoing */
  const pendingSaveRef = useRef({ id: null, type: null });

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let image;
    if (DEBUG) {
      const t0 = performance.now();
      image = canvas.toDataURL();
      const dt = performance.now() - t0;
      if (!saveState._logCount) saveState._logCount = 0;
      saveState._logCount++;
      console.log("[EaseL] saveState (toDataURL) stroke #" + saveState._logCount + ":", dt.toFixed(1), "ms, history length:", history.current.length + 1);
    } else {
      image = canvas.toDataURL();
    }

    historyStep.current++;
    history.current = history.current.slice(0, historyStep.current);
    history.current.push(image);

    // Limit history to prevent memory issues (keep last 30 states)
    if (history.current.length > 30) {
      history.current = history.current.slice(-30);
      historyStep.current = history.current.length - 1;
    }

    setCanUndo(historyStep.current > 0);
    setCanRedo(false);
  }, [canvasRef]);

  /** Schedule saveState to run when the browser is idle so we don't block the next frames (avoids 17–22ms toDataURL on stroke end). */
  const scheduleSaveState = useCallback(() => {
    const pending = pendingSaveRef.current;
    if (pending.id != null) {
      if (pending.type === "idle" && typeof cancelIdleCallback !== "undefined") cancelIdleCallback(pending.id);
      else clearTimeout(pending.id);
      pending.id = null;
      pending.type = null;
    }
    const doSave = () => {
      pendingSaveRef.current.id = null;
      pendingSaveRef.current.type = null;
      saveState();
    };
    if (typeof requestIdleCallback !== "undefined") {
      pendingSaveRef.current = { id: requestIdleCallback(doSave, { timeout: 40 }), type: "idle" };
    } else {
      pendingSaveRef.current = { id: setTimeout(doSave, 0), type: "timeout" };
    }
  }, [saveState]);

  const restoreState = useCallback(
    (image) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };

      img.src = image;
    },
    [canvasRef]
  );

  const startStroke = useCallback(() => {
    pointsRef.current = [];
    lastDrawnEndRef.current = null;
    isDrawing.current = true;
    // Capture latest settings from refs so we never use stale values
    currentStrokeColor.current = latestBrushColor.current;
    currentStrokeTool.current = latestTool.current;
    currentStrokeSize.current = latestBrushSize.current;
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawing.current) return;

    if (pointsRef.current.length > 0) scheduleSaveState();

    pointsRef.current = [];
    isDrawing.current = false;
  }, [scheduleSaveState]);

  // One-shot fill at (x, y) with explicit color — caller passes current color from ref so it's never stale
  const fillAt = useCallback(
    (x, y, fillColor) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      floodFill(ctx, Math.floor(x), Math.floor(y), fillColor ?? latestBrushColor.current);
      saveState();
    },
    [canvasRef, saveState]
  );

  const drawCallCountRef = useRef(0);
  const draw = useCallback(
    (x, y) => {
      const canvas = canvasRef.current;
      if (!canvas || !isDrawing.current) return;

      const ctx = canvas.getContext("2d");

      // Fill is handled by fillAt() on mouth open — never as a continuous stroke
      if (currentStrokeTool.current === "fill") return;

      const t0 = DEBUG ? performance.now() : 0;
      pointsRef.current.push({ x, y });
      const points = pointsRef.current;
      const isEraser = currentStrokeTool.current === "eraser";

      // Incremental draw: one segment per frame, connected to previous segment to avoid gaps/dotted lines
      if (points.length === 1) {
        lastDrawnEndRef.current = { x: points[0].x, y: points[0].y };
      } else if (points.length >= 2) {
        const prev = points[points.length - 2];
        const curr = points[points.length - 1];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        const from = lastDrawnEndRef.current ?? prev;
        drawSegment(
          ctx,
          from.x,
          from.y,
          prev.x,
          prev.y,
          midX,
          midY,
          currentStrokeColor.current,
          currentStrokeSize.current,
          isEraser
        );
        lastDrawnEndRef.current = { x: midX, y: midY };
      }

      if (DEBUG) {
        drawCallCountRef.current++;
        if (drawCallCountRef.current % 100 === 0) {
          const dt = performance.now() - t0;
          console.log("[EaseL] draw() every 100 calls:", dt.toFixed(2), "ms, points this stroke:", points.length);
        }
      }
    },
    [canvasRef]
  );

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  }, [canvasRef, saveState]);

  const undo = useCallback(() => {
    if (historyStep.current <= 0) return;

    const pending = pendingSaveRef.current;
    if (pending.id != null) {
      if (pending.type === "idle" && typeof cancelIdleCallback !== "undefined") cancelIdleCallback(pending.id);
      else clearTimeout(pending.id);
      pending.id = null;
      pending.type = null;
    }

    historyStep.current--;
    restoreState(history.current[historyStep.current]);

    setCanUndo(historyStep.current > 0);
    setCanRedo(true);
  }, [restoreState]);

  const redo = useCallback(() => {
    if (historyStep.current >= history.current.length - 1) return;

    historyStep.current++;
    restoreState(history.current[historyStep.current]);

    setCanUndo(true);
    setCanRedo(historyStep.current < history.current.length - 1);
  }, [restoreState]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    history.current = [canvas.toDataURL()];
    historyStep.current = 0;
  }, [canvasRef]);

  return {
    draw,
    fillAt,
    startStroke,
    endStroke,
    clear,
    undo,
    redo,
    canUndo,
    canRedo,
    initCanvas,
  };
}