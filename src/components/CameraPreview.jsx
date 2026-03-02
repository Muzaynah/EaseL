// components/CameraPreview.jsx
// Bottom-left camera preview window

import React from "react";

function CameraPreview({ videoRef }) {
  return (
    <div className="absolute left-6 bottom-6 rounded-xl border-2 border-white/80 shadow-xl overflow-hidden bg-slate-900 z-[100]">
      <div className="relative w-28 h-20">
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
