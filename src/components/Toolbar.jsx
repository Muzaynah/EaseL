// components/Toolbar.jsx
// Bottom toolbar with tool selection, colors, sizes, and actions

import React from "react";
import { UI_TOKENS } from "../theme/uiTokens";

const COLORS = UI_TOKENS.brush.palette;

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
    <div
      className="easeL-auth-card absolute bottom-6 left-1/2 z-[150] flex max-w-[95vw] -translate-x-1/2 items-center gap-3 overflow-x-auto p-2.5"
    >
      
      {/* Tools Section */}
      <div className="flex items-center gap-2 px-2">
        <button
          ref={setBtnRef("pencil")}
          className={`easeL-transition-standard p-3 rounded-2xl text-lg ${
            tool === "pencil"
              ? "scale-105 bg-[var(--easeL-primary)] text-white shadow-lg"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:from-slate-100 hover:to-slate-200"
          } ${isHovered("pencil") ? "ring-4 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white" : ""}`}
          title="Pencil"
        >
          ✏️
        </button>
        <button
          ref={setBtnRef("eraser")}
          className={`easeL-transition-standard p-3 rounded-2xl text-lg ${
            tool === "eraser"
              ? "scale-105 bg-[var(--easeL-primary)] text-white shadow-lg"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:from-slate-100 hover:to-slate-200"
          } ${isHovered("eraser") ? "ring-4 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white" : ""}`}
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
            className={`easeL-transition-standard w-8 h-8 rounded-xl shadow-md hover:scale-110 active:scale-95 ${
              brushColor === color 
                ? "ring-4 ring-offset-2 ring-offset-white scale-110 shadow-xl" 
                : "hover:shadow-lg"
            } ${isHovered(`col-${color}`) ? "ring-4 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white" : ""}`}
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
            className={`easeL-transition-standard flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl ${
              brushSize === value
                ? "scale-105 bg-[var(--easeL-primary)] text-white shadow-lg"
                : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:from-slate-100 hover:to-slate-200"
            } ${isHovered(`sz-${value}`) ? "ring-4 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white" : ""}`}
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
          className={`easeL-transition-standard p-3 rounded-2xl text-lg font-bold ${
            canUndo
              ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 hover:from-blue-100 hover:to-blue-200 shadow-md hover:shadow-lg active:scale-95"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300 cursor-not-allowed opacity-50"
          } ${isHovered("undo") && canUndo ? "ring-4 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white" : ""}`}
          title="Undo"
        >
          ↶
        </button>
        <button
          ref={setBtnRef("redo")}
          disabled={!canRedo}
          className={`easeL-transition-standard p-3 rounded-2xl text-lg font-bold ${
            canRedo
              ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 hover:from-blue-100 hover:to-blue-200 shadow-md hover:shadow-lg active:scale-95"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300 cursor-not-allowed opacity-50"
          } ${isHovered("redo") && canRedo ? "ring-4 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white" : ""}`}
          title="Redo"
        >
          ↷
        </button>
        <button
          ref={setBtnRef("clear")}
          className={`easeL-transition-standard p-3 text-lg rounded-2xl bg-gradient-to-br from-red-50 to-red-100 text-red-600 hover:from-red-100 hover:to-red-200 shadow-md hover:shadow-lg active:scale-95 ${
            isHovered("clear") ? "ring-4 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white" : ""
          }`}
          title="Clear Canvas"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}