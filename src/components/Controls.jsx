import React from "react";

export default function Controls({ brushSize, setBrushSize, onClear }) {
  return (
    <div className="mt-4 flex items-center gap-4 bg-white p-3 rounded-xl shadow">
      <div>
        <label className="text-sm font-medium">Brush Size</label>
        <input
          type="range"
          min="2"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="ml-2"
        />
      </div>
      <button
        onClick={onClear}
        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
      >
        Clear
      </button>
    </div>
  );
}
