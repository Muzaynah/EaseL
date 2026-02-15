import { useRef, useCallback, useState } from "react";
import { drawSmoothLine, floodFill } from "../utils/canvasUtils";

export function useDrawing({ canvasRef, brushSize, brushColor, tool }) {
  const pointsRef = useRef([]);
  const history = useRef([]);
  const historyStep = useRef(-1);
  const isDrawing = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const image = canvas.toDataURL();

    historyStep.current++;
    history.current = history.current.slice(0, historyStep.current);
    history.current.push(image);

    setCanUndo(historyStep.current > 0);
    setCanRedo(false);
  }, [canvasRef]);

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
    isDrawing.current = true;
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawing.current) return;

    if (pointsRef.current.length > 0) saveState();

    pointsRef.current = [];
    isDrawing.current = false;
  }, [saveState]);

  const draw = useCallback(
    (x, y) => {
      const canvas = canvasRef.current;
      if (!canvas || !isDrawing.current) return;

      const ctx = canvas.getContext("2d");

      if (tool === "fill") {
        floodFill(ctx, Math.floor(x), Math.floor(y), brushColor);
        saveState();
        isDrawing.current = false;
        return;
      }

      pointsRef.current.push({ x, y });

      const isEraser = tool === "eraser";

      drawSmoothLine(
        ctx,
        pointsRef.current,
        brushColor,
        brushSize,
        isEraser
      );
    },
    [canvasRef, brushColor, brushSize, tool, saveState]
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
