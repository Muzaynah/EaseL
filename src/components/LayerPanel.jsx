import React from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";

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
  const canDelete = layers.length > 1;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
        {[...layers].reverse().map((layer, displayIndex) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              className={`rounded-xl overflow-hidden transition-all ${
                isActive
                  ? "ring-2 ring-[var(--easeL-primary)] ring-offset-2 ring-offset-white"
                  : "hover:bg-slate-100/80"
              }`}
            >
              <div className="flex items-center gap-2 p-2">
                <button
                  type="button"
                  onClick={() => onLayerSelect?.(layer.id)}
                  className="flex-1 flex items-center gap-2 min-h-10 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[var(--easeL-focus-ring)] focus:ring-offset-1"
                  aria-pressed={isActive}
                  aria-label={`Select ${layer.name}`}
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-200 overflow-hidden border border-slate-200">
                    {(() => {
                      const thumb = getLayerCanvasData ? getLayerCanvasData(layer.id) : layer.canvasData;
                      return thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100" />
                      );
                    })()}
                  </div>
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {layer.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onLayerToggleVisibility?.(layer.id)}
                  className="min-w-9 min-h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[var(--easeL-focus-ring)]"
                  aria-label={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
              <div className="flex px-2 pb-2 gap-1">
                <button
                  type="button"
                  onClick={() => onLayerReorder?.(layer.id, "down")}
                  disabled={displayIndex === 0}
                  className="flex-1 min-h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[var(--easeL-focus-ring)]"
                  aria-label="Move layer up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onLayerReorder?.(layer.id, "up")}
                  disabled={displayIndex === layers.length - 1}
                  className="flex-1 min-h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[var(--easeL-focus-ring)]"
                  aria-label="Move layer down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-auto pt-3 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => onLayerAdd?.()}
          className="easeL-btn-solid flex flex-1 min-h-10 items-center justify-center gap-2 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)] focus:ring-offset-2 text-sm"
          aria-label="Add layer"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
        <button
          type="button"
          onClick={() => activeLayerId && onLayerDelete?.(activeLayerId)}
          disabled={!canDelete}
          className="min-h-10 min-w-10 rounded-xl flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Delete layer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
