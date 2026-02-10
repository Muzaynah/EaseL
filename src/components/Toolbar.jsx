// components/Toolbar.jsx
// Bottom toolbar with tool selection, colors, sizes, and actions

import React from "react";

const COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#FBBF24", // Amber
  "#FFD133", // Yellow
  "#84CC16", // Lime
  "#22C55E", // Green
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#64748B", // Slate
  "#1F2937", // Dark
];

const SIZES = [
  { value: 8, label: "S" },
  { value: 20, label: "M" },
  { value: 35, label: "L" },
  { value: 55, label: "XL" },
];

export default function Toolbar({
  tool,
  brushColor,
  brushSize,
  hoveredButton,
  canUndo,
  canRedo,
  setBtnRef,
}) {
  const isHovered = (id) => hoveredButton === id;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-md p-2.5 rounded-3xl shadow-2xl border border-white/60 z-[150] max-w-[95vw] overflow-x-auto">
      
      {/* Tools Section */}
      <div className="flex items-center gap-2 px-2">
        <button
          ref={setBtnRef("pencil")}
          className={`p-3 rounded-2xl transition-all duration-200 text-lg ${
            tool === "pencil"
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:from-slate-100 hover:to-slate-200"
          } ${isHovered("pencil") ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-white" : ""}`}
          title="Pencil"
        >
          ✏️
        </button>
        <button
          ref={setBtnRef("eraser")}
          className={`p-3 rounded-2xl transition-all duration-200 text-lg ${
            tool === "eraser"
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:from-slate-100 hover:to-slate-200"
          } ${isHovered("eraser") ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-white" : ""}`}
          title="Eraser"
        >
          🧽
        </button>
      </div>

      <div className="w-[1px] h-10 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

      {/* Colors Section */}
      <div className="flex items-center gap-1.5 px-2 flex-wrap max-w-md">
        {COLORS.map((color) => (
          <button
            key={color}
            ref={setBtnRef(`col-${color}`)}
            className={`w-8 h-8 rounded-xl transition-all duration-200 shadow-md hover:scale-110 active:scale-95 ${
              brushColor === color 
                ? "ring-4 ring-offset-2 ring-offset-white scale-110 shadow-xl" 
                : "hover:shadow-lg"
            } ${isHovered(`col-${color}`) ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-white" : ""}`}
            style={{ 
              backgroundColor: color,
              ringColor: brushColor === color ? color : undefined
            }}
            title={color}
          />
        ))}
      </div>

      <div className="w-[1px] h-10 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

      {/* Sizes Section */}
      <div className="flex items-center gap-3 px-2">
        {SIZES.map(({ value, label }) => (
          <button
            key={value}
            ref={setBtnRef(`sz-${value}`)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
              brushSize === value
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105"
                : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:from-slate-100 hover:to-slate-200"
            } ${isHovered(`sz-${value}`) ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-white" : ""}`}
            title={`Size: ${label}`}
          >
            <div
              className={`rounded-full transition-all ${
                brushSize === value ? "bg-white" : "bg-slate-700"
              }`}
              style={{
                width: Math.max(value / 6 + 4, 6),
                height: Math.max(value / 6 + 4, 6),
              }}
            />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </div>

      <div className="w-[1px] h-10 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

      {/* Actions Section */}
      <div className="flex items-center gap-2 px-2">
        <button
          ref={setBtnRef("undo")}
          disabled={!canUndo}
          className={`p-3 rounded-2xl transition-all duration-200 text-lg font-bold ${
            canUndo
              ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 hover:from-blue-100 hover:to-blue-200 shadow-md hover:shadow-lg active:scale-95"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300 cursor-not-allowed opacity-50"
          } ${isHovered("undo") && canUndo ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-white" : ""}`}
          title="Undo"
        >
          ↶
        </button>
        <button
          ref={setBtnRef("redo")}
          disabled={!canRedo}
          className={`p-3 rounded-2xl transition-all duration-200 text-lg font-bold ${
            canRedo
              ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 hover:from-blue-100 hover:to-blue-200 shadow-md hover:shadow-lg active:scale-95"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300 cursor-not-allowed opacity-50"
          } ${isHovered("redo") && canRedo ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-white" : ""}`}
          title="Redo"
        >
          ↷
        </button>
        <button
          ref={setBtnRef("clear")}
          className={`p-3 text-lg rounded-2xl transition-all duration-200 bg-gradient-to-br from-red-50 to-red-100 text-red-600 hover:from-red-100 hover:to-red-200 shadow-md hover:shadow-lg active:scale-95 ${
            isHovered("clear") ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-white" : ""
          }`}
          title="Clear Canvas"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}