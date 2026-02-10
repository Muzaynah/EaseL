/**
 * src/utils/canvasUtils.js
 * Contains the drawing logic and flood fill algorithms.
 */

export const drawSmoothLine = (ctx, points, color, lineWidth) => {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const midPointX = (points[i].x + points[i + 1].x) / 2;
    const midPointY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midPointX, midPointY);
  }
  ctx.stroke();
};

export const floodFill = (ctx, startX, startY, fillColorHex) => {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  };

  const fillColor = hexToRgb(fillColorHex);
  const startPos = (startY * w + startX) * 4;
  const startR = data[startPos], startG = data[startPos+1], startB = data[startPos+2];

  if (startR === fillColor[0] && startG === fillColor[1] && startB === fillColor[2]) return;

  const stack = [[startX, startY]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const pos = (y * w + x) * 4;
    if (x >= 0 && x < w && y >= 0 && y < h && data[pos] === startR && data[pos+1] === startG && data[pos+2] === startB) {
      data[pos] = fillColor[0]; 
      data[pos+1] = fillColor[1]; 
      data[pos+2] = fillColor[2]; 
      data[pos+3] = 255;
      stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
    }
  }
  ctx.putImageData(imgData, 0, 0);
};