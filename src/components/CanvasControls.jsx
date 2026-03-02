import React, { useState, useRef, useEffect } from 'react';
import {
  Brush,
  Eraser,
  PaintBucket,
  Undo,
  Redo,
  Trash2,
  Save
} from 'lucide-react';

const colors = [
  '#e60c2d', '#3fd611', '#ffe119', '#2c53e0', '#ff8f3f', '#9d49f0', 
  '#85f1f1', '#f282d0', '#854f11', '#686868', '#ffffff', '#000000'
];

const CanvasControls = React.forwardRef(({
  tool, setTool, color, setColor, brushSize, setBrushSize,
  onUndo, onRedo, onClear, canUndo, canRedo, hoveredButton,
  onSaveProject, saveStatus
}, ref) => {

  const panelRef = useRef(null);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (e) => {
    setDragging(true);
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const stopDrag = () => setDragging(false);

  const onDrag = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y
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

  const btnClass = (isActive, buttonId) => `
    p-3 rounded-xl transition-all duration-200
    flex items-center justify-center
    border border-slate-200/80 bg-white/95
    ${isActive
      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg border-indigo-400/50'
      : 'text-slate-700 hover:bg-slate-100 hover:border-slate-300'
    }
    ${hoveredButton === buttonId ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white' : ''}
  `;

  const register = (id, el) => {
    if (ref && ref.current) {
      ref.current[id] = el;
    }
  };

  return (
    <div
      ref={panelRef}
      style={{ left: position.x, top: position.y }}
      className="absolute z-[500] w-72"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-xl p-6 space-y-6 text-slate-800">

        {/* Drag Handle */}
        <div
          onPointerDown={startDrag}
          className="cursor-grab active:cursor-grabbing flex justify-center items-center"
        >
          <div className="w-8 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Tools */}
        <div className="grid grid-cols-3 gap-2">
          <button
            ref={el => register('brush', el)}
            className={btnClass(tool === 'brush', 'brush')}
            onClick={() => setTool('brush')}
          >
            <Brush size={20} />
          </button>

          <button
            ref={el => register('eraser', el)}
            className={btnClass(tool === 'eraser', 'eraser')}
            onClick={() => setTool('eraser')}
          >
            <Eraser size={20} />
          </button>

          <button
            ref={el => register('fill', el)}
            className={btnClass(tool === 'fill', 'fill')}
            onClick={() => setTool('fill')}
          >
            <PaintBucket size={20} />
          </button>
        </div>

        {/* Brush Size */}
        <div className="space-y-3">
          <label className="text-xs uppercase tracking-widest text-slate-500 font-medium">
            Brush Size {brushSize}px
          </label>
          <input
            type="range"
            min="2"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer active:cursor-grabbing bg-slate-200 accent-indigo-500"
          />
        </div>

        {/* Color Palette */}
        <div className="grid grid-cols-4 gap-3">
          {colors.map((c) => (
            <button
              key={c}
              ref={el => register(`col-${c}`, el)}
              onClick={() => setColor(c)}
              className={`
                w-10 h-10 rounded-full transition-all duration-200 border-2
                ${color === c ? 'scale-110 ring-2 ring-indigo-400 ring-offset-2 ring-offset-white border-indigo-500' : 'border-slate-200 hover:border-slate-300 hover:scale-105'}
                ${hoveredButton === `col-${c}` ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}
              `}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* History & Actions */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200/80">
          <button
            ref={el => register('undo', el)}
            onClick={onUndo}
            disabled={!canUndo}
            className={`${btnClass(false, 'undo')} ${!canUndo ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Undo size={18} />
          </button>

          <button
            ref={el => register('redo', el)}
            onClick={onRedo}
            disabled={!canRedo}
            className={`${btnClass(false, 'redo')} ${!canRedo ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Redo size={18} />
          </button>

          <button
            ref={el => register('clear', el)}
            onClick={onClear}
            className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Save Project */}
        <div className="pt-4 border-t border-slate-200/80">
          <button
            ref={el => register('save', el)}
            onClick={onSaveProject}
            disabled={saveStatus !== 'idle'}
            className={`
              w-full min-h-11 rounded-xl font-semibold text-sm transition-all
              flex items-center justify-center gap-2
              ${saveStatus === 'saving'
                ? 'bg-indigo-400 cursor-wait text-white border border-indigo-500'
                : saveStatus === 'saved'
                  ? 'bg-emerald-600 text-white border border-emerald-700 cursor-default'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-700'
              }
              ${saveStatus === 'idle' ? '' : 'opacity-90'}
              ${hoveredButton === 'save' ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white' : ''}
            `}
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
                <Save size={18} />
                Save Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default CanvasControls;
