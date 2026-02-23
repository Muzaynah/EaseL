import React, { useState, useRef, useEffect } from 'react';
import {
  Brush,
  Eraser,
  PaintBucket,
  Undo,
  Redo,
  Trash2
} from 'lucide-react';

const colors = [
  '#e60c2d', '#3fd611', '#ffe119', '#2c53e0', '#ff8f3f', '#9d49f0', 
  '#85f1f1', '#f282d0', '#854f11', '#686868', '#ffffff', '#000000'
];

const CanvasControls = React.forwardRef(({
  tool, setTool, color, setColor, brushSize, setBrushSize,
  onUndo, onRedo, onClear, canUndo, canRedo, hoveredButton
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
    backdrop-blur-md border border-white/10
    ${isActive
      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg'
      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
    }
    ${hoveredButton === buttonId ? 'ring-2 ring-indigo-400' : ''}
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
      <div className="bg-neutral-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-6 space-y-6 text-white">

        {/* Drag Handle */}
        <div
          onPointerDown={startDrag}
          className="cursor-grab active:cursor-grabbing flex justify-center items-center"
        >
          
          <div className="w-8 h-1 bg-white/20 rounded-full" />
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
          <label className="text-xs uppercase tracking-widest text-white/40">
            Brush Size {brushSize}px
          </label>
          <input
            type="range"
            min="2"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full h-1 rounded-lg appearance-none cursor-pointer active:cursor-grabbing bg-gradient-to-r from-indigo-500 to-purple-500"
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
                w-10 h-10 rounded-full transition-all duration-200
                ${color === c ? 'scale-110 ring-2 ring-white' : 'hover:scale-110'}
                ${hoveredButton === `col-${c}` ? 'ring-2 ring-indigo-400' : ''}
              `}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* History & Actions */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
          <button
            ref={el => register('undo', el)}
            onClick={onUndo}
            disabled={!canUndo}
            className={`${btnClass(false, 'undo')} ${!canUndo ? 'opacity-30' : ''}`}
          >
            <Undo size={18} />
          </button>

          <button
            ref={el => register('redo', el)}
            onClick={onRedo}
            disabled={!canRedo}
            className={`${btnClass(false, 'redo')} ${!canRedo ? 'opacity-30' : ''}`}
          >
            <Redo size={18} />
          </button>

          <button
            ref={el => register('clear', el)}
            onClick={onClear}
            className="p-3 pl-7 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-200"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default CanvasControls;
