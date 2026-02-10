// src/App.jsx
// Main component for tremor-tolerant facial gesture drawing application

import React, { useEffect, useRef, useState } from "react";
import { useFaceMesh } from "./hooks/useFaceMesh";
import { useDrawing } from "./hooks/useDrawing";
import { useGestureControl } from "./hooks/useGestureControl";
import Toolbar from "./components/Toolbar";
import DrawingCanvas from "./components/DrawingCanvas";
import CameraPreview from "./components/CameraPreview";
import Cursor from "./components/Cursor";
import StatusHUD from "./components/StatusHUD";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Drawing state
  const [brushSize, setBrushSize] = useState(20);
  const [brushColor, setBrushColor] = useState("#FFD133");
  const [tool, setTool] = useState("pencil");
  const [isPenDown, setIsPenDown] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 800, y: 500 });
  const [hoveredButton, setHoveredButton] = useState(null);

  // Button refs for hover detection
  const buttonRefs = useRef({});

  // Custom hooks
  const { startFaceMesh } = useFaceMesh({
    videoRef,
    onResults: handleFaceMeshResults,
  });

  const {
    draw,
    startStroke,
    endStroke,
    clear,
    undo,
    redo,
    canUndo,
    canRedo,
    initCanvas,
  } = useDrawing({
    canvasRef,
    brushSize,
    brushColor,
    tool,
  });

  const { processLandmarks } = useGestureControl({
    onPositionUpdate: setCursorPos,
    onPenToggle: handlePenToggle,
    onButtonHover: setHoveredButton,
    buttonRefs,
  });

  function handlePenToggle(newPenState) {
    console.log("Pen toggled:", newPenState); // Debug
    
    if (newPenState && !isPenDown) {
      // Pen just went down - start new stroke
      startStroke();
      setIsPenDown(true);
    } else if (!newPenState && isPenDown) {
      // Pen just went up - end stroke
      endStroke();
      setIsPenDown(false);
    }
  }

  useEffect(() => {
    startFaceMesh();
  }, [startFaceMesh]);

  useEffect(() => {
    if (canvasRef.current) {
      initCanvas();
    }
  }, [initCanvas]);

  function handleFaceMeshResults(results) {
  if (!results.multiFaceLandmarks?.[0]) return;

  const landmarks = results.multiFaceLandmarks[0];
  const { position, hoveredBtn } = processLandmarks(
    landmarks,
    isPenDown
  );

  // Cursor already updated via ref, but keep state in sync
  setCursorPos(position);

  if (hoveredBtn) {
    handleButtonClick(hoveredBtn);
    return;
  }

  if (isPenDown && canvasRef.current) {
    const rect = canvasRef.current.getBoundingClientRect();

    const inside =
      position.x >= rect.left &&
      position.x <= rect.right &&
      position.y >= rect.top &&
      position.y <= rect.bottom;

    if (inside) {
      const drawX =
        (position.x - rect.left) *
        (canvasRef.current.width / rect.width);
      const drawY =
        (position.y - rect.top) *
        (canvasRef.current.height / rect.height);

      draw(drawX, drawY);
    } else {
      endStroke();
    }
  }
}

  function handleButtonClick(btnId) {
    if (btnId === "clear") {
      clear();
    } else if (btnId === "undo") {
      undo();
    } else if (btnId === "redo") {
      redo();
    } else if (btnId.startsWith("col-")) {
      setBrushColor(btnId.replace("col-", ""));
    } else if (btnId.startsWith("sz-")) {
      setBrushSize(parseInt(btnId.replace("sz-", "")));
    } else if (btnId === "pencil") {
      setTool("pencil");
    } else if (btnId === "eraser") {
      setTool("eraser");
    }
  }

  const setBtnRef = (id) => (el) => {
    buttonRefs.current[id] = el;
  };

  return (
    <div className="relative w-screen h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center overflow-hidden font-sans select-none">
      
      {/* Status HUD */}
      <StatusHUD isPenDown={isPenDown} />

      {/* Drawing Canvas */}
      <DrawingCanvas canvasRef={canvasRef} />

      {/* Custom Cursor */}
      <Cursor
        position={cursorPos}
        size={brushSize}
        color={brushColor}
        isPenDown={isPenDown}
        tool={tool}
      />

      {/* Toolbar */}
      <Toolbar
        tool={tool}
        brushColor={brushColor}
        brushSize={brushSize}
        hoveredButton={hoveredButton}
        canUndo={canUndo}
        canRedo={canRedo}
        setBtnRef={setBtnRef}
      />

      {/* Camera Preview */}
      <CameraPreview videoRef={videoRef} />
    </div>
  );
}
