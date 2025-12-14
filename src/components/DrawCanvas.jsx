import React, { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import Controls from "./Controls";

export default function DrawCanvas() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const feedRef = useRef(null);

  const [brushSize, setBrushSize] = useState(6);

  useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  const feed = feedRef.current;
  const fctx = feed.getContext("2d");
  const video = videoRef.current;

  const saved = localStorage.getItem("easelDrawing");
  if (saved) {
    const img = new Image();
    img.src = saved;
    img.onload = () => ctx.drawImage(img, 0, 0);
  }

  let prevX = null;
  let prevY = null;

   const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  faceMesh.onResults((results) => {
    fctx.save();
    fctx.clearRect(0, 0, feed.width, feed.height);
    fctx.translate(feed.width, 0);
    fctx.scale(-1, 1); // mirror horizontally

    if (!results.multiFaceLandmarks[0]) {
      fctx.restore();
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    fctx.drawImage(results.image, 0, 0, feed.width, feed.height);

    // draw landmarks
    fctx.strokeStyle = "rgba(0,255,0,0.4)";
    for (const pt of landmarks) {
      fctx.beginPath();
      fctx.arc(pt.x * feed.width, pt.y * feed.height, 1, 0, 2 * Math.PI);
      fctx.stroke();
    }

    const nose = landmarks[1];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const mouthOpen = Math.abs(upperLip.y - lowerLip.y) > 0.03;

    const x = (1 - nose.x) * canvas.width; // mirrored coordinate
    const y = nose.y * canvas.height;

    // cursor (gray)
    fctx.beginPath();
    fctx.arc(nose.x * feed.width, nose.y * feed.height, brushSize * 0.6, 0, 2 * Math.PI);
    fctx.fillStyle = "rgba(128,128,128,0.4)";
    fctx.fill();

    // draw line if mouth open
    if (mouthOpen) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (prevX !== null && prevY !== null) ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();
      prevX = x;
      prevY = y;
      localStorage.setItem("easelDrawing", canvas.toDataURL());
    } else {
      prevX = null;
      prevY = null;
    }

    fctx.restore();
  });

  async function init() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // short delay for wasm load
      const camera = new Camera(video, {
        onFrame: async () => {
          await faceMesh.send({ image: video });
        },
        width: 480,
        height: 360,
      });
      await camera.start();
    } catch (err) {
      console.error("Camera or FaceMesh init failed:", err);
    }
  }

  init();

  return () => {
    faceMesh.close();
  };
}, [brushSize]);


  function handleClear() {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    localStorage.removeItem("easelDrawing");
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-6 items-start">
        {/* Webcam feed with tracking */}
        <div className="flex flex-col items-center">
          <video
            ref={videoRef}
            className="hidden"
            width="480"
            height="360"
            autoPlay
            playsInline
          ></video>
          <canvas
            ref={feedRef}
            width="480"
            height="360"
            className="border rounded-xl shadow"
          ></canvas>
          <p className="text-xs mt-1 text-gray-600">Tracking Feed</p>
        </div>

        {/* Drawing Canvas */}
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className="border rounded-xl shadow bg-white"
          ></canvas>
          <p className="text-xs mt-1 text-gray-600">Drawing Canvas</p>
        </div>
      </div>

      <Controls
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        onClear={handleClear}
      />
    </div>
  );
}
