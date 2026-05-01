// hooks/useDrawing.js
import { useRef, useCallback, useState, useEffect } from "react";
import { drawSegment, floodFill } from "../utils/canvasUtils";

const DEBUG = typeof window === "undefined" || window.EaseL_DEBUG !== false;

export function useDrawing({ canvasRef, brushSize, brushColor, tool, layers = null, activeLayerId = null }) {
  const pointsRef = useRef([]);
  const history = useRef([]);
  const historyStep = useRef(-1);
  const isDrawing = useRef(false);
  /** End point of the last drawn segment — keeps incremental strokes connected */
  const lastDrawnEndRef = useRef(null);

  /** Off-screen canvas per layer: layerId -> { canvas, ctx } */
  const layerCanvasesRef = useRef(new Map());

  // Refs for layers so callbacks see current values
  const layersRef = useRef(layers);
  const activeLayerIdRef = useRef(activeLayerId);
  layersRef.current = layers;
  activeLayerIdRef.current = activeLayerId;

  const useLayers = Array.isArray(layers) && layers.length > 0 && activeLayerId != null;

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

  /** Remove layer canvases for ids no longer in the layers list */
  const pruneLayerCanvases = useCallback(() => {
    const list = layersRef.current || [];
    const ids = new Set(list.map((l) => l.id));
    const map = layerCanvasesRef.current;
    for (const id of map.keys()) {
      if (!ids.has(id)) map.delete(id);
    }
  }, []);

  /** Get or create off-screen canvas for a layer (same size as main canvas) */
  const getLayerCanvas = useCallback(
    (layerId) => {
      const main = canvasRef.current;
      if (!main) return null;
      let entry = layerCanvasesRef.current.get(layerId);
      if (!entry) {
        const canvas = document.createElement("canvas");
        canvas.width = main.width;
        canvas.height = main.height;
        entry = { canvas, ctx: canvas.getContext("2d") };
        layerCanvasesRef.current.set(layerId, entry);
      }
      return entry;
    },
    [canvasRef]
  );

  /** Composite all visible layers onto main canvas in order */
  const compositeToMain = useCallback(() => {
    const main = canvasRef.current;
    if (!main) return;
    const ctx = main.getContext("2d");
    const list = layersRef.current || [];
    ctx.clearRect(0, 0, main.width, main.height);
    for (const layer of list) {
      if (!layer.visible) continue;
      const entry = layerCanvasesRef.current.get(layer.id);
      if (!entry) continue;
      ctx.drawImage(entry.canvas, 0, 0);
    }
  }, [canvasRef]);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (useLayers) {
      pruneLayerCanvases();
      const list = layersRef.current || [];
      const snapshot = { layers: {} };
      for (const layer of list) {
        const entry = layerCanvasesRef.current.get(layer.id);
        snapshot.layers[layer.id] = entry ? entry.canvas.toDataURL() : "";
      }
      historyStep.current++;
      history.current = history.current.slice(0, historyStep.current);
      history.current.push(snapshot);
    } else {
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
    }

    // Limit history to prevent memory issues (keep last 30 states)
    if (history.current.length > 30) {
      history.current = history.current.slice(-30);
      historyStep.current = history.current.length - 1;
    }

    setCanUndo(historyStep.current > 0);
    setCanRedo(false);
  }, [canvasRef, useLayers, pruneLayerCanvases]);

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
    (snapshot) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (useLayers && snapshot && typeof snapshot === "object" && snapshot.layers) {
        const list = layersRef.current || [];
        let pending = list.length;
        const maybeDone = () => {
          pending--;
          if (pending === 0) compositeToMain();
        };
        for (const layer of list) {
          const dataUrl = snapshot.layers[layer.id];
          const entry = getLayerCanvas(layer.id);
          if (!entry) {
            maybeDone();
            continue;
          }
          if (dataUrl) {
            const img = new Image();
            img.onload = () => {
              entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
              entry.ctx.drawImage(img, 0, 0);
              maybeDone();
            };
            img.src = dataUrl;
          } else {
            entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
            maybeDone();
          }
        }
      } else {
        const image = typeof snapshot === "string" ? snapshot : null;
        if (image == null) return;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = image;
      }
    },
    [canvasRef, useLayers, getLayerCanvas, compositeToMain]
  );

  const startStroke = useCallback(() => {
    pointsRef.current = [];
    lastDrawnEndRef.current = null;
    isDrawing.current = true;
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

  const fillAt = useCallback(
    (x, y, fillColor) => {
      if (useLayers) {
        const entry = getLayerCanvas(activeLayerIdRef.current);
        if (!entry) return;
        const ctx = entry.ctx;
        floodFill(ctx, Math.floor(x), Math.floor(y), fillColor ?? latestBrushColor.current);
        compositeToMain();
        saveState();
      } else {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        floodFill(ctx, Math.floor(x), Math.floor(y), fillColor ?? latestBrushColor.current);
        saveState();
      }
    },
    [canvasRef, useLayers, getLayerCanvas, compositeToMain, saveState]
  );

  const drawCallCountRef = useRef(0);
  const draw = useCallback(
    (x, y) => {
      if (!isDrawing.current) return;

      if (currentStrokeTool.current === "fill") return;

      const t0 = DEBUG ? performance.now() : 0;
      pointsRef.current.push({ x, y });
      const points = pointsRef.current;
      const isEraser = currentStrokeTool.current === "eraser";

      if (useLayers) {
        const entry = getLayerCanvas(activeLayerIdRef.current);
        if (!entry) return;
        const ctx = entry.ctx;

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
        compositeToMain();
      } else {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

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
      }

      if (DEBUG) {
        drawCallCountRef.current++;
        if (drawCallCountRef.current % 100 === 0) {
          const dt = performance.now() - t0;
          console.log("[EaseL] draw() every 100 calls:", dt.toFixed(2), "ms, points this stroke:", points.length);
        }
      }
    },
    [canvasRef, useLayers, getLayerCanvas, compositeToMain]
  );

  const clear = useCallback(() => {
    if (useLayers) {
      const entry = getLayerCanvas(activeLayerIdRef.current);
      if (entry) {
        entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
        compositeToMain();
      }
      saveState();
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  }, [canvasRef, useLayers, getLayerCanvas, compositeToMain, saveState]);

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

    if (useLayers) {
      pruneLayerCanvases();
      const list = layersRef.current || [];
      for (const layer of list) {
        const entry = getLayerCanvas(layer.id);
        if (entry) entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
      }
      compositeToMain();
      // Only set initial history when empty (first init); preserve history when layers change
      if (history.current.length === 0) {
        const snapshot = { layers: {} };
        for (const layer of list) {
          const entry = layerCanvasesRef.current.get(layer.id);
          snapshot.layers[layer.id] = entry ? entry.canvas.toDataURL() : "";
        }
        history.current = [snapshot];
        historyStep.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      }
    } else {
      history.current = [canvas.toDataURL()];
      historyStep.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [canvasRef, useLayers, pruneLayerCanvases, getLayerCanvas, compositeToMain]);

  const getLayerCanvasData = useCallback(
    (layerId) => {
      const entry = layerCanvasesRef.current.get(layerId);
      return entry ? entry.canvas.toDataURL() : "";
    },
    []
  );

  const loadProjectLayers = useCallback(
    async (layerDataMap) => {
      if (!useLayers) return;
      const list = layersRef.current || [];
      const jobs = list.map(
        (layer) =>
          new Promise((resolve) => {
            const entry = getLayerCanvas(layer.id);
            if (!entry) return resolve();
            const dataUrl = layerDataMap?.[layer.id];
            entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
            if (!dataUrl) return resolve();
            const img = new Image();
            img.onload = () => {
              entry.ctx.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = dataUrl;
          }),
      );
      await Promise.all(jobs);
      compositeToMain();
      saveState();
    },
    [useLayers, getLayerCanvas, compositeToMain, saveState],
  );

  // Re-composite when layer list or visibility changes
  useEffect(() => {
    if (useLayers && canvasRef.current) compositeToMain();
  }, [layers, useLayers, compositeToMain]);

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
    getLayerCanvasData,
    loadProjectLayers,
  };
}
