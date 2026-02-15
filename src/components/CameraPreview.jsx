// components/CameraPreview.jsx
// Bottom-left camera preview window

import React from "react";

function CameraPreview({ videoRef }) {
  return (
    <div className="absolute top-6 left-6 rounded-2xl border-4 border-white/80 shadow-2xl overflow-hidden bg-slate-900 z-[100]">
      <div className="relative w-44 h-32">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          autoPlay
          muted
          playsInline
        />
      </div>
    </div>
  );
}

export default React.memo(CameraPreview);
