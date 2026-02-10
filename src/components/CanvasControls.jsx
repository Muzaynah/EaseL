

// src/components/CanvasControls.jsx
import React from 'react';
import { 
  Brush, 
  Eraser, 
  PaintBucket, 
  Undo, 
  Redo, 
  Trash2 
} from 'lucide-react';

/**
 * src/components/CanvasControls.jsx
 * Re-implemented with lucide-react for environment compatibility.
 * Features large hit-zones for head-tracking accessibility.
 */

const colors = [
  '#2D2D2D', '#FF6B6B', '#4ECDC4', '#45B7D1', 
  '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6'
];

const CanvasControls = React.forwardRef(({
  tool, setTool, color, setColor, brushSize, setBrushSize,
  onUndo, onRedo, onClear, canUndo, canRedo, hoveredButton
}, ref) => {
  
  const btnClass = (isActive, buttonId) => `
    p-4 rounded-xl shadow-sm transition-all duration-200 border-2
    flex items-center justify-center text-xl
    ${isActive 
      ? 'bg-amber-400 border-amber-600 translate-y-1' 
      : 'bg-white border-gray-200 hover:bg-gray-50'
    }
    ${hoveredButton === buttonId ? 'ring-4 ring-blue-400' : ''}
  `;

  // Helper to register buttons into the parent's ref object for hit-testing
  const register = (id, el) => {
    if (ref && ref.current) {
      ref.current[id] = el;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-stone-50 rounded-2xl shadow-lg w-64 h-fit border border-stone-200 absolute bottom-10 left-10 z-[500]">
      
      {/* Tools */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          ref={el => register('brush', el)}
          className={btnClass(tool === 'brush', 'brush')} 
          onClick={() => setTool('brush')}
        >
          <Brush />
        </button>
        <button 
          ref={el => register('eraser', el)}
          className={btnClass(tool === 'eraser', 'eraser')} 
          onClick={() => setTool('eraser')}
        >
          <Eraser />
        </button>
        <button 
          ref={el => register('fill', el)}
          className={btnClass(tool === 'fill', 'fill')} 
          onClick={() => setTool('fill')}
        >
          <PaintBucket />
        </button>
      </div>

      {/* Brush Size */}
      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
          Brush Size: {brushSize}px
        </label>
        <input
          type="range" min="2" max="50" value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Color Palette */}
      <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-gray-200">
        {colors.map((c) => (
          <button
            key={c}
            ref={el => register(`col-${c}`, el)}
            onClick={() => setColor(c)}
            className={`
              w-10 h-10 rounded-full border-2 transition-transform hover:scale-110
              ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}
              ${hoveredButton === `col-${c}` ? 'ring-4 ring-blue-400' : ''}
            `}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* History & Global Actions */}
      <div className="grid grid-cols-3 gap-2 border-t pt-4">
        <button 
          ref={el => register('undo', el)}
          onClick={onUndo} 
          disabled={!canUndo}
          className={`${btnClass(false, 'undo')} ${!canUndo ? 'opacity-20' : ''}`}
        >
          <Undo size={18} />
        </button>
        <button 
          ref={el => register('redo', el)}
          onClick={onRedo} 
          disabled={!canRedo}
          className={`${btnClass(false, 'redo')} ${!canRedo ? 'opacity-20' : ''}`}
        >
          <Redo size={18} />
        </button>
        <button 
          ref={el => register('clear', el)}
          onClick={onClear} 
          className={`${btnClass(false, 'clear')} bg-red-50 border-red-200 text-red-600`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
});

export default CanvasControls;
