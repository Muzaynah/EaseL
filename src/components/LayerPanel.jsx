import React, { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, PanelRightClose, PanelRightOpen } from "lucide-react";

export default function LayerPanel({
  layers = [],
  activeLayerId,
  getLayerCanvasData,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerToggleVisibility,
  onLayerReorder,
}) {
  const [minimized, setMinimized] = useState(false);
  const canDelete = layers.length > 1;

  return (
    <div
      className={`absolute right-6 top-20 z-[150] rounded-2xl bg-white/90 backdrop-blur-md shadow-2xl border border-white/50 overflow-hidden transition-all duration-300 ${
        minimized ? "w-14" : "w-56"
      }`}
      aria-label="Layers panel"
    >
      <div className="p-3 border-b border-slate-200/80 flex items-center justify-between gap-2 min-h-12">
        {!minimized && <h3 className="text-sm font-semibold text-slate-800">Layers</h3>}
        <button
          type="button"
          onClick={() => setMinimized((m) => !m)}
          className="min-w-10 min-h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 ml-auto"
          aria-label={minimized ? "Expand layers panel" : "Minimize layers panel"}
        >
          {minimized ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
        </button>
      </div>
      {!minimized && (
        <>
      <div className="p-2 max-h-[320px] overflow-y-auto">
        {/* Display top-most layer first (reverse of draw order so list matches visual stack) */}
        {[...layers].reverse().map((layer, displayIndex) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              className={`mb-2 rounded-xl overflow-hidden transition-all ${
                isActive
                  ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white/90"
                  : "hover:bg-slate-100/80"
              }`}
            >
              <div className="flex items-center gap-2 p-2">
                <button
                  type="button"
                  onClick={() => onLayerSelect?.(layer.id)}
                  className="flex-1 flex items-center gap-2 min-h-12 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
                  aria-pressed={isActive}
                  aria-label={`Select ${layer.name}`}
                >
                  <div className="w-12 h-12 shrink-0 rounded-lg bg-slate-200 overflow-hidden border border-slate-200">
                    {(() => {
                      const thumb = getLayerCanvasData ? getLayerCanvasData(layer.id) : layer.canvasData;
                      return thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100" />
                      );
                    })()}
                  </div>
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {layer.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onLayerToggleVisibility?.(layer.id)}
                  className="min-w-[2.5rem] min-h-12 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>
              <div className="flex px-2 pb-2 gap-1">
                <button
                  type="button"
                  onClick={() => onLayerReorder?.(layer.id, "down")}
                  disabled={displayIndex === 0}
                  className="flex-1 min-h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label="Move layer up"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onLayerReorder?.(layer.id, "up")}
                  disabled={displayIndex === layers.length - 1}
                  className="flex-1 min-h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label="Move layer down"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-2 border-t border-slate-200/80 flex gap-2">
        <button
          type="button"
          onClick={() => onLayerAdd?.()}
          className="easeL-btn-solid flex flex-1 min-h-12 items-center justify-center gap-2 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)] focus:ring-offset-2"
          aria-label="Add layer"
        >
          <Plus className="w-5 h-5" />
          Add Layer
        </button>
        <button
          type="button"
          onClick={() => activeLayerId && onLayerDelete?.(activeLayerId)}
          disabled={!canDelete}
          className="min-h-12 min-w-12 rounded-xl flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Delete layer"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
        </>
      )}
    </div>
  );
}
