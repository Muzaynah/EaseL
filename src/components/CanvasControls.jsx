import React, { useEffect, useRef, useState } from 'react';
import {
  Brush,
  Eraser,
  PaintBucket,
  Undo,
  Redo,
  Trash2,
  Save,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { UI_TOKENS } from "../theme/uiTokens";

const colors = UI_TOKENS.brush.vibrantPalette;

const CanvasControls = React.forwardRef(({
  tool,
  setTool,
  color,
  setColor,
  brushSize,
  setBrushSize,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  hoveredButton,
  onSaveProject,
  saveStatus,
  onOpenSettings,
  compactMode,
  onToggleCompact,
}, ref) => {
  const [position, setPosition] = useState({ x: 28, y: 120 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (e) => {
    e.preventDefault();
    setDragging(true);
    offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const stopDrag = () => setDragging(false);

  const onDrag = (e) => {
    if (!dragging) return;
    setPosition({
      x: Math.max(12, Math.min(window.innerWidth - 260, e.clientX - offset.current.x)),
      y: Math.max(90, Math.min(window.innerHeight - 220, e.clientY - offset.current.y)),
    });
  };

  useEffect(() => {
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', stopDrag);
    return () => {
      window.removeEventListener('pointermove', onDrag);
      window.removeEventListener('pointerup', stopDrag);
    };
  }, [dragging]);

  const register = (id, el) => {
    if (ref && ref.current) ref.current[id] = el;
  };

  // Explicit color for icons — reliable across all render paths
  const iconColor = (isActive) => isActive ? '#ffffff' : '#475569';

  const btnClass = (isActive, buttonId) => [
    'p-3 rounded-xl transition-all duration-150',
    'flex items-center justify-center min-w-[44px] min-h-[44px]',
    'border',
    isActive
      ? 'bg-[var(--easeL-primary)] border-[#235875] shadow-md'
      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-[var(--easeL-primary)] text-slate-600',
    hoveredButton === buttonId
      ? 'ring-2 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white'
      : '',
  ].filter(Boolean).join(' ');

  // When compact: render only the floating mini toolbar (position:fixed)
  if (compactMode) {
    return (
      <div
        className="fixed z-[600] w-56 rounded-2xl border-2 border-slate-200 bg-white/98 p-3 shadow-2xl backdrop-blur-xl select-none"
        style={{ left: position.x, top: position.y }}
      >
        <div
          onPointerDown={startDrag}
          className="mb-3 flex cursor-grab active:cursor-grabbing items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
        >
          <span className="flex items-center gap-1.5">
            <Menu className="w-3 h-3" />
            Mini toolbar
          </span>
          <button
            type="button"
            onClick={onToggleCompact}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Restore full toolbar"
          >
            <X size={13} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { id: 'brush', Icon: Brush, active: tool === 'brush', onClick: () => setTool('brush'), label: 'Brush' },
            { id: 'eraser', Icon: Eraser, active: tool === 'eraser', onClick: () => setTool('eraser'), label: 'Eraser' },
            { id: 'fill', Icon: PaintBucket, active: tool === 'fill', onClick: () => setTool('fill'), label: 'Fill' },
            { id: 'settings', Icon: Settings, active: false, onClick: onOpenSettings, label: 'Settings' },
          ].map(({ id, Icon, active, onClick, label }) => (
            <button
              key={id}
              className={btnClass(active, id)}
              onClick={onClick}
              aria-label={label}
              title={label}
            >
              <Icon size={16} color={iconColor(active)} />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {colors.slice(0, 10).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-8 w-full rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                color === c
                  ? 'border-[color:var(--easeL-primary)] ring-2 ring-[color:var(--easeL-focus-ring)] ring-offset-1 scale-110'
                  : 'border-transparent hover:border-slate-200'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`${btnClass(false, 'undo')} ${!canUndo ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Undo"
          >
            <Undo size={15} color={iconColor(false)} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`${btnClass(false, 'redo')} ${!canRedo ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Redo"
          >
            <Redo size={15} color={iconColor(false)} />
          </button>
          <button
            onClick={onClear}
            className="p-3 min-w-[44px] min-h-[44px] rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center justify-center"
            aria-label="Clear canvas"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  }

  // Full sidebar panel
  return (
    <div className="easeL-card rounded-3xl border-2 border-slate-200 bg-[var(--easeL-bg-section)] shadow-xl flex flex-col overflow-hidden">
      <div className="p-4 flex flex-col gap-5 overflow-y-auto flex-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-800 tracking-wide">Drawing tools</p>
          <button
            type="button"
            onClick={onToggleCompact}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-[var(--easeL-primary)] shadow-sm transition-all"
          >
            <Menu className="w-3.5 h-3.5" />
            Mini
          </button>
        </div>

        {/* Tool buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'brush', Icon: Brush, active: tool === 'brush', onClick: () => setTool('brush'), label: 'Brush' },
            { id: 'eraser', Icon: Eraser, active: tool === 'eraser', onClick: () => setTool('eraser'), label: 'Eraser' },
            { id: 'fill', Icon: PaintBucket, active: tool === 'fill', onClick: () => setTool('fill'), label: 'Fill' },
            { id: 'settings', Icon: Settings, active: false, onClick: onOpenSettings, label: 'Settings' },
          ].map(({ id, Icon, active, onClick, label }) => (
            <button
              key={id}
              ref={(el) => register(id, el)}
              className={btnClass(active, id)}
              onClick={onClick}
              aria-label={label}
              title={label}
            >
              <Icon size={18} color={iconColor(active)} />
            </button>
          ))}
        </div>

        {/* Brush size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Brush Size</label>
            <span className="text-xs font-bold text-[var(--easeL-primary)] bg-blue-50 px-2 py-0.5 rounded-lg tabular-nums">
              {brushSize}px
            </span>
          </div>
          <div className="relative flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <input
              type="range"
              min="2"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--easeL-primary)]"
            />
            <div className="w-4 h-4 rounded-full bg-slate-400 shrink-0" />
          </div>
        </div>

        {/* Color palette */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Color</label>
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-md ring-1 ring-slate-200"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] font-mono text-slate-400">{color}</span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {colors.map((c) => (
              <button
                key={c}
                ref={(el) => register(`col-${c}`, el)}
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full border-2 transition-all duration-150 hover:scale-110 active:scale-95 ${
                  color === c
                    ? 'scale-110 ring-2 ring-[color:var(--easeL-primary)] ring-offset-2 ring-offset-white border-[color:var(--easeL-primary)]'
                    : 'border-transparent hover:border-slate-200'
                } ${hoveredButton === `col-${c}` ? 'ring-2 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white' : ''}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Undo / Redo / Clear */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
          <button
            ref={(el) => register('undo', el)}
            onClick={onUndo}
            disabled={!canUndo}
            className={`${btnClass(false, 'undo')} ${!canUndo ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Undo"
            title="Undo"
          >
            <Undo size={18} color={iconColor(false)} />
          </button>
          <button
            ref={(el) => register('redo', el)}
            onClick={onRedo}
            disabled={!canRedo}
            className={`${btnClass(false, 'redo')} ${!canRedo ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Redo"
            title="Redo"
          >
            <Redo size={18} color={iconColor(false)} />
          </button>
          <button
            ref={(el) => register('clear', el)}
            onClick={onClear}
            className="p-3 min-w-[44px] min-h-[44px] rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center justify-center"
            aria-label="Clear canvas"
            title="Clear canvas"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Save */}
        <button
          ref={(el) => register('save', el)}
          onClick={onSaveProject}
          disabled={saveStatus !== 'idle'}
          className={[
            'w-full min-h-[44px] rounded-xl font-semibold text-sm transition-all duration-150',
            'flex items-center justify-center gap-2',
            saveStatus === 'saving'
              ? 'bg-[var(--easeL-primary)] cursor-wait text-white border border-[#235875]'
              : saveStatus === 'saved'
                ? 'bg-emerald-500 text-white border border-emerald-600 cursor-default'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-[var(--easeL-primary)] hover:text-white hover:border-[var(--easeL-primary)] active:scale-95',
            hoveredButton === 'save' ? 'ring-2 ring-[color:var(--easeL-focus-ring)] ring-offset-2 ring-offset-white' : '',
          ].filter(Boolean).join(' ')}
          aria-label="Save project"
        >
          {saveStatus === 'saving' ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : saveStatus === 'saved' ? (
            'Saved!'
          ) : (
            <>
              <Save size={16} />
              Save Project
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default CanvasControls;
