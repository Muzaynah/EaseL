
// hooks/useFaceMesh.js
// Hook for initializing and managing MediaPipe FaceMesh

import { useRef, useCallback } from "react";

export function useFaceMesh({ videoRef, onResults }) {
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);

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

      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      if (videoRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            await faceMesh.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });
        camera.start();
        cameraRef.current = camera;
      }
    };

    return () => {
      faceMeshRef.current?.close?.();
      cameraRef.current?.stop?.();
    };
  }, [videoRef, onResults]);

  return { startFaceMesh };
}