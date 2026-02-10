// Canvas.jsx
// A React component that provides a drawing canvas controlled by facial gestures using MediaPipe Face Mesh.

// Features to be added next:
// - Save and load drawings.
// - More advanced brush types and effects.
// - Customizable gesture controls.
// - Undo/redo functionality.
// - Performance optimizations for lower-end devices.
// - Mobile responsiveness enhancements.
// - User settings persistence (e.g., localStorage).
// - Tutorial or onboarding for new users.
// - Error handling for MediaPipe loading issues.
// - Refactor to separate concerns (e.g., separate FaceMesh logic into a custom hook).
// - Optimize asset loading (e.g., lazy load scripts).
// - Add sound effects for drawing actions
// - Implement pressure sensitivity or width variation based on mouth openness?
// - Explore multi-face tracking for collaborative drawing sessions.
// - Add a fullscreen mode for distraction-free drawing.
// - Implement a color picker for custom colors.
// - short cut options with accesibility in mind.
// - Explore AI-assisted drawing features.
// - Implement a gallery to view saved drawings.
// - Add social sharing options for drawings.
// - Implement a loading state while MediaPipe assets are being fetched.
// - Add visual feedback for detected facial landmarks.
// - Explore integration with other input methods (e.g., voice commands).
// - Implement a tutorial mode to guide new users through the features.
// - Explore WebGL-based rendering for improved performance and effects.

import React, { useEffect, useRef, useState } from "react";


export default function DrawCanvas() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const faceMeshRef = useRef(null);

  // States (For UI Sync)
  const [brushSize, setBrushSize] = useState(20);
  const [brushColor, setBrushColor] = useState("#FFD133");
  const [tool, setTool] = useState("pencil");
  const [brushPos, setBrushPos] = useState({ x: 800, y: 500 });
  const [isPenDownUI, setIsPenDownUI] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  // Logic Refs (Crucial for instant response and preventing "stale" drawing)
  const currentPos = useRef({ x: 800, y: 500 });
  const prevPos = useRef({ x: null, y: null });
  const isPenDown = useRef(false);
  const activeColor = useRef("#FFD133");
  const activeTool = useRef("pencil");
  const buttonRefs = useRef({});
  const canToggleMouth = useRef(true);

  useEffect(() => {
    const script1 = document.createElement("script");
    script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
    const script2 = document.createElement("script");
    script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
    document.head.appendChild(script1);
    document.head.appendChild(script2);

    script1.onload = () => {
      const faceMesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.8,
      });

      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      if (videoRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => { await faceMesh.send({ image: videoRef.current }); },
          width: 640, height: 480,
        });
        camera.start();
      }
    };

    function onResults(results) {
      if (!results.multiFaceLandmarks?.[0] || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const landmarks = results.multiFaceLandmarks[0];

      // 1. ROTATION TRACKPAD + PITCH OFFSET
      const nose = landmarks[1];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];
      const midX = (leftEar.x + rightEar.x) / 2;
      const midY = (leftEar.y + rightEar.y) / 2;

      const yaw = (nose.x - midX);
      const pitch = (nose.y - midY) - 0.04; // Laptop view offset

      const deadzone = 0.02;
      const sensitivity = 75;
      const friction = 0.65;

      let dx = 0, dy = 0;
      if (Math.abs(yaw) > deadzone) dx = (yaw - (Math.sign(yaw) * deadzone)) * sensitivity;
      if (Math.abs(pitch) > deadzone) dy = (pitch - (Math.sign(pitch) * deadzone)) * sensitivity;

      currentPos.current.x -= dx * friction;
      currentPos.current.y += dy * friction;

      // Bound to screen limits
      currentPos.current.x = Math.max(0, Math.min(window.innerWidth, currentPos.current.x));
      currentPos.current.y = Math.max(0, Math.min(window.innerHeight, currentPos.current.y));

      setBrushPos({ x: currentPos.current.x, y: currentPos.current.y });

      // 2. MOUTH GESTURE (Toggle/Select)
      const mouthHeight = Math.abs(landmarks[13].y - landmarks[14].y);
      const isMouthOpen = mouthHeight > 0.055;

      let currentHover = null;
      Object.keys(buttonRefs.current).forEach((id) => {
        const btn = buttonRefs.current[id];
        if (btn) {
          const b = btn.getBoundingClientRect();
          if (currentPos.current.x >= b.left && currentPos.current.x <= b.right &&
            currentPos.current.y >= b.top && currentPos.current.y <= b.bottom) {
            currentHover = id;
          }
        }
      });
      setHoveredButton(currentHover);

      if (isMouthOpen && canToggleMouth.current) {
        if (currentHover) {
          handleFaceClick(currentHover);
        } else {
          isPenDown.current = !isPenDown.current;
          setIsPenDownUI(isPenDown.current);
        }
        canToggleMouth.current = false;
      } else if (!isMouthOpen) {
        canToggleMouth.current = true;
      }

      // 3. DRAWING LOGIC (Using Refs for absolute sync)
      const rect = canvas.getBoundingClientRect();
      const isInsideCanvas = (
        currentPos.current.x >= rect.left && currentPos.current.x <= rect.right &&
        currentPos.current.y >= rect.top && currentPos.current.y <= rect.bottom
      );

      // ONLY draw if isPenDown.current is TRUE
      if (isPenDown.current && isInsideCanvas) {
        const drawX = (currentPos.current.x - rect.left) * (canvas.width / rect.width);
        const drawY = (currentPos.current.y - rect.top) * (canvas.height / rect.height);

        ctx.strokeStyle = activeTool.current === "eraser" ? "#FFFFFF" : activeColor.current;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        if (prevPos.current.x !== null) {
          ctx.moveTo(prevPos.current.x, prevPos.current.y);
          ctx.lineTo(drawX, drawY);
          ctx.stroke();
        } else {
          // Fallback for single clicks
          ctx.arc(drawX, drawY, brushSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = activeTool.current === "eraser" ? "#FFFFFF" : activeColor.current;
          ctx.fill();
        }
        prevPos.current = { x: drawX, y: drawY };
      } else {
        // IMPORTANT: Clear the buffer when pen is up or outside canvas
        prevPos.current = { x: null, y: null };
      }
    }
  }, [brushSize]); // Only brushSize triggers effect refresh for drawing complexity

  const handleFaceClick = (id) => {
    if (id === 'clear') {
      canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    } else if (id.startsWith('col-')) {
      const color = id.replace('col-', '');
      setBrushColor(color);
      activeColor.current = color; // Sync Ref
    } else if (id.startsWith('sz-')) {
      setBrushSize(parseInt(id.replace('sz-', '')));
    } else if (id === 'pencil-t') {
      setTool('pencil');
      activeTool.current = 'pencil'; // Sync Ref
    } else if (id === 'eraser-t') {
      setTool('eraser');
      activeTool.current = 'eraser'; // Sync Ref
    }
  };

  const setBtnRef = (id) => (el) => { buttonRefs.current[id] = el; };

  return (
    <div className="relative w-screen h-screen bg-slate-100 flex items-center justify-center overflow-hidden font-sans select-none">

      {/* HUD Info */}
      <div className="absolute top-6 flex gap-4 z-[200]">
        <div className={`px-6 py-2 rounded-2xl border-2 shadow-xl transition-all ${isPenDownUI ? 'bg-green-500 border-green-700 text-white scale-105' : 'bg-white border-slate-300 text-slate-500'}`}>
          <span className="font-bold text-xs tracking-widest">{isPenDownUI ? "PEN: ON" : "PEN: OFF (OPEN MOUTH TO TOGGLE PEN OR SELECT BUTTON)"}</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl border-4 border-slate-200 w-[92%] h-[78%] overflow-hidden z-10">
        <canvas ref={canvasRef} width={2000} height={1500} className="w-full h-full" />
      </div>

      {/* Synchronized Global Cursor */}
      <div
        className="fixed pointer-events-none rounded-full border-2 border-white shadow-2xl z-[999]"
        style={{
          left: brushPos.x,
          top: brushPos.y,
          width: brushSize + 6,
          height: brushSize + 6,
          transform: 'translate(-50%, -50%)',
          backgroundColor: isPenDownUI ? (tool === 'eraser' ? 'white' : brushColor) : 'rgba(0,0,0,0.1)',
        }}
      />

      {/* Toolbar */}
      <div className="absolute bottom-10 flex items-center gap-6 bg-white/95 p-4 px-10 rounded-[2.5rem] shadow-2xl border border-slate-200 z-[150]">
        <div className="flex gap-2">
          <button ref={setBtnRef('pencil-t')} className={`p-4 rounded-2xl transition-all ${tool === 'pencil' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'} ${hoveredButton === 'pencil-t' ? 'ring-2 ring-blue-400 scale-105' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg></button>
          <button ref={setBtnRef('eraser-t')} className={`p-4 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'} ${hoveredButton === 'eraser-t' ? 'ring-2 ring-blue-400 scale-105' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /></svg></button>
        </div>
        <div className="w-[1px] h-10 bg-slate-200" />
        <div className="flex gap-3">
          {["#EF4444", "#22C55E", "#3B82F6", "#FFD133"].map(c => (
            <button key={c} ref={setBtnRef(`col-${c}`)} className={`w-10 h-10 rounded-2xl border-2 transition-all ${brushColor === c ? 'border-slate-800 scale-110 shadow-md' : 'border-white'} ${hoveredButton === `col-${c}` ? 'brightness-75' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="w-[1px] h-10 bg-slate-200" />
        <div className="flex items-center gap-6">
          {[10, 25, 45].map(s => (
            <button key={s} ref={setBtnRef(`sz-${s}`)} className={`flex items-center justify-center transition-all ${brushSize === s ? 'scale-125' : 'opacity-20'} ${hoveredButton === `sz-${s}` ? 'opacity-100 scale-110' : ''}`}>
              <div className="rounded-full bg-slate-800" style={{ width: s / 5 + 8, height: s / 5 + 8 }} />
            </button>
          ))}
        </div>
        <div className="w-[1px] h-10 bg-slate-200" />
        <button ref={setBtnRef('clear')} className={`p-4 text-red-500 bg-red-50 rounded-2xl ${hoveredButton === 'clear' ? 'bg-red-100 scale-110' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg></button>
      </div>

      <div className="absolute bottom-10 left-10 w-44 h-32 rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-black/80 ring-1 ring-slate-300 z-[150]">
        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1] opacity-50" autoPlay muted playsInline />
      </div>
    </div>
  );
}