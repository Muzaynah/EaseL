// hooks/useDrawing.js
// Hook for managing canvas drawing with undo/redo functionality

import { useRef, useCallback, useState } from "react";

export function useDrawing({ canvasRef, brushSize, brushColor, tool }) {
  const prevPos = useRef({ x: null, y: null });
  const history = useRef([]);
  const historyStep = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isDrawing = useRef(false);
  const strokeStarted = useRef(false);

  const saveState = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL();

    // Remove any redo states when drawing new stroke
    historyStep.current++;
    history.current = history.current.slice(0, historyStep.current);
    history.current.push(imageData);

    // Limit history to 50 steps
    if (history.current.length > 50) {
      history.current.shift();
      historyStep.current--;
    }

    setCanUndo(historyStep.current > 0);
    setCanRedo(false);
  }, [canvasRef]);

  const restoreState = useCallback((imageData) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };

    img.src = imageData;
  }, [canvasRef]);

  const startStroke = useCallback(() => {
    prevPos.current = { x: null, y: null };
    strokeStarted.current = false;
    isDrawing.current = true;
  }, []);

  const endStroke = useCallback(() => {
    if (strokeStarted.current) {
      saveState();
    }
    prevPos.current = { x: null, y: null };
    strokeStarted.current = false;
    isDrawing.current = false;
  }, [saveState]);

  const draw = useCallback((x, y) => {
    if (!canvasRef.current || !isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (prevPos.current.x !== null && prevPos.current.y !== null) {
      // Draw smooth line using quadratic curves
      ctx.beginPath();
      const midX = (prevPos.current.x + x) / 2;
      const midY = (prevPos.current.y + y) / 2;
      ctx.moveTo(prevPos.current.x, prevPos.current.y);
      ctx.quadraticCurveTo(prevPos.current.x, prevPos.current.y, midX, midY);
      ctx.stroke();
      strokeStarted.current = true;
    } else {
      // First point - just draw a dot
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      strokeStarted.current = true;
    }

    prevPos.current = { x, y };
  }, [canvasRef, brushSize, brushColor, tool]);

  const clear = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    saveState();
    prevPos.current = { x: null, y: null };
  }, [canvasRef, saveState]);

  const undo = useCallback(() => {
    if (historyStep.current <= 0) return;

    historyStep.current--;
    restoreState(history.current[historyStep.current]);
    
    setCanUndo(historyStep.current > 0);
    setCanRedo(true);
    prevPos.current = { x: null, y: null };
  }, [restoreState]);

  const redo = useCallback(() => {
    if (historyStep.current >= history.current.length - 1) return;

    historyStep.current++;
    restoreState(history.current[historyStep.current]);
    
    setCanUndo(true);
    setCanRedo(historyStep.current < history.current.length - 1);
    prevPos.current = { x: null, y: null };
  }, [restoreState]);

  // Initialize with blank state
  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL();
    history.current = [imageData];
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