// hooks/useFaceMesh.js
// Hook for initializing and managing MediaPipe FaceMesh

import { useRef, useCallback, useEffect } from "react";

// Set window.EaseL_DEBUG = false in console to disable timing logs
const DEBUG = typeof window === "undefined" || window.EaseL_DEBUG !== false;

export function useFaceMesh({ videoRef, onResults }) {
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const cameraStartTimeoutRef = useRef(null);
  const onResultsRef = useRef(onResults);
  const debugFrameCountRef = useRef(0);
  onResultsRef.current = onResults;

  const startFaceMesh = useCallback(() => {
    const script1 = document.createElement("script");
    script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js";
    const script2 = document.createElement("script");
    script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js";

    document.head.appendChild(script1);
    document.head.appendChild(script2);

    script1.onload = () => {
      const faceMesh = new window.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.8,
      });

      faceMesh.onResults((results) => {
        if (DEBUG) {
          const t0 = performance.now();
          onResultsRef.current(results);
          const dt = performance.now() - t0;
          debugFrameCountRef.current++;
          if (debugFrameCountRef.current % 60 === 0) {
            console.log("[EaseL] faceMesh onResults (every 60 frames):", dt.toFixed(2), "ms");
          }
        } else {
          onResultsRef.current(results);
        }
      });
      faceMeshRef.current = faceMesh;

      if (DEBUG) console.log("[EaseL] FaceMesh + Camera started (onResults stabilized via ref)");

      const startCameraWhenVideoReady = () => {
        if (!videoRef.current) {
          const t = setTimeout(startCameraWhenVideoReady, 50);
          cameraStartTimeoutRef.current = t;
          return;
        }
        if (!window.Camera) {
          const t = setTimeout(startCameraWhenVideoReady, 50);
          cameraStartTimeoutRef.current = t;
          return;
        }
        if (cameraStartTimeoutRef.current) clearTimeout(cameraStartTimeoutRef.current);
        cameraStartTimeoutRef.current = null;
        const video = videoRef.current;
        const camera = new window.Camera(video, {
          onFrame: async () => {
            if (videoRef.current) await faceMesh.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });
        camera.start();
        cameraRef.current = camera;
      };
      startCameraWhenVideoReady();
    };

    return () => {
      if (DEBUG) console.log("[EaseL] FaceMesh cleanup (camera stop, faceMesh close)");
      if (cameraStartTimeoutRef.current) clearTimeout(cameraStartTimeoutRef.current);
      cameraStartTimeoutRef.current = null;
      faceMeshRef.current?.close?.();
      cameraRef.current?.stop?.();
    };
  }, [videoRef]);

  return { startFaceMesh };
}