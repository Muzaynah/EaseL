import React, { useEffect, useRef, useState } from "react";
import FaceTrackerEngine from "../utils/FaceTrackerEngine";

export default function FaceTracker({ onFaceData }) {
  const videoRef = useRef(null);
  const engineRef = useRef(null);
  const [landmarksPx, setLandmarksPx] = useState([]);
  const [noseText, setNoseText] = useState({ x: "0.000", y: "0.000" });

  useEffect(() => {
    let mounted = true;
    let stream = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        if (!mounted) return;
        videoRef.current.srcObject = stream;

        // wait briefly for video metadata
        await new Promise((res) => {
          const v = videoRef.current;
          if (v.readyState >= 2 && v.videoWidth) return res();
          const onLoaded = () => res();
          v.addEventListener("loadeddata", onLoaded, { once: true });
          setTimeout(res, 1200);
        });

        engineRef.current = new FaceTrackerEngine({
          videoElement: videoRef.current,
          onResults: (results) => {
            if (!mounted) return;
            if (!results?.multiFaceLandmarks?.length) {
              setLandmarksPx([]);
              onFaceData && onFaceData(null);
              return;
            }

            const lm = results.multiFaceLandmarks[0];

            // compute pixel coords based on the video intrinsic size
            const vw = videoRef.current.videoWidth || videoRef.current.clientWidth;
            const vh = videoRef.current.videoHeight || videoRef.current.clientHeight;
            const pts = lm.map((p) => ({ x: p.x * vw, y: p.y * vh }));

            // mouth open detection using indices 13 & 14
            const upperLip = lm[13];
            const lowerLip = lm[14];
            const mouthDist = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y, upperLip.z - lowerLip.z);
            const mouthOpen = mouthDist > 0.045;

            // nose smoothing
            const nose = lm[1];
            if (!window.__easel_prev_nose) window.__easel_prev_nose = { x: nose.x, y: nose.y, z: nose.z };
            const alpha = 0.22;
            const smoothNose = {
              x: window.__easel_prev_nose.x + alpha * (nose.x - window.__easel_prev_nose.x),
              y: window.__easel_prev_nose.y + alpha * (nose.y - window.__easel_prev_nose.y),
              z: window.__easel_prev_nose.z + alpha * (nose.z - window.__easel_prev_nose.z)
            };
            window.__easel_prev_nose = smoothNose;

            setLandmarksPx(pts);
            setNoseText({ x: smoothNose.x.toFixed(3), y: smoothNose.y.toFixed(3) });

            onFaceData && onFaceData({ nose: smoothNose, mouthOpen });
          }
        });

        engineRef.current.start();
      } catch (e) {
        console.warn("FaceTracker start failed", e);
      }
    }

    start();

    return () => {
      mounted = false;
      engineRef.current?.stop();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onFaceData]);

  const renderLandmarks = () => {
    if (!landmarksPx.length) return null;
    // video element client size for overlay mapping
    const vw = videoRef.current?.clientWidth || 320;
    const vh = videoRef.current?.clientHeight || 240;
    return landmarksPx.map((pt, i) => {
      // mirror horizontally to match mirrored video
      const cx = (vw - pt.x).toFixed(1);
      const cy = pt.y.toFixed(1);
      const r = i === 1 ? 5 : 2;
      const fill = i === 1 ? "#00ff66" : "#ffffffcc";
      return <circle key={i} cx={cx} cy={cy} r={r} fill={fill} />;
    });
  };

  return (
    <div className="relative w-48 h-36 border rounded-md overflow-hidden shadow bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover transform scale-x-[-1]"
        autoPlay
        playsInline
        muted
      />
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
        viewBox={`0 0 ${videoRef.current?.clientWidth || 320} ${videoRef.current?.clientHeight || 240}`}
        preserveAspectRatio="none"
      >
        {renderLandmarks()}
      </svg>

      <div className="absolute bottom-1 left-1 text-xs text-white bg-black/60 px-1 rounded">
        Nose x={noseText.x} y={noseText.y}
      </div>
    </div>
  );
}
