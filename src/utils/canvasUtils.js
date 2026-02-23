// utils/canvasUtils.js
export function getCanvasCoordinates(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function drawSmoothLine(ctx, points, color, size, isEraser = false) {
  if (points.length < 2) return;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = size;

  if (isEraser) {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  ctx.stroke();
  ctx.closePath();

  ctx.globalCompositeOperation = "source-over";
}

/** Draw a single segment from (fromX, fromY) to (toX, toY) with control point (ctrlX, ctrlY). Used for incremental strokes so segments connect. */
export function drawSegment(ctx, fromX, fromY, ctrlX, ctrlY, toX, toY, color, size, isEraser = false) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = size;
  if (isEraser) {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
  }
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, toX, toY);
  ctx.stroke();
  ctx.closePath();
  ctx.globalCompositeOperation = "source-over";
}

export function floodFill(ctx, startX, startY, fillColor) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const stack = [[startX, startY]];
  const targetColor = getColorAtPixel(data, w, startX, startY);
  const fill = hexToRgba(fillColor);

  if (colorsMatch(targetColor, fill)) return;

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const currentColor = getColorAtPixel(data, w, x, y);

    if (!colorsMatch(currentColor, targetColor)) continue;

    setColorAtPixel(data, w, x, y, fill);

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function getColorAtPixel(data, width, x, y) {
  const index = (y * width + x) * 4;
  return data.slice(index, index + 4);
}

function setColorAtPixel(data, width, x, y, color) {
  const index = (y * width + x) * 4;
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = 255;
}

function colorsMatch(a, b) {
  return (
    a[0] === b[0] &&
    a[1] === b[1] &&
    a[2] === b[2] &&
    a[3] === b[3]
  );
}

function hexToRgba(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255,
    255,
  ];
}
