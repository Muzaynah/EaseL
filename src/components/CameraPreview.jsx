// components/CameraPreview.jsx
// Camera preview for drawing page sidebar

import React from "react";

function CameraPreview({ videoRef }) {
  return (
    <div className="w-full aspect-video rounded-xl border-2 border-white/80 shadow-xl overflow-hidden bg-slate-900">
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        autoPlay
        muted
        playsInline
      />
    </div>
  );
}

export default React.memo(CameraPreview);
