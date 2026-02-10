// components/CameraPreview.jsx
// Bottom-left camera preview window

import React from "react";

export default function CameraPreview({ videoRef }) {
  return (
    <div className="absolute bottom-6 left-6 rounded-2xl border-4 border-white/80 shadow-2xl overflow-hidden bg-slate-900 z-[100]">
      <div className="relative w-44 h-32">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          autoPlay
          muted
          playsInline
        />
        {/* Recording indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-[10px] font-bold">REC</span>
        </div>
      </div>
    </div>
  );
}