import { distanceToPath } from "./lessonPath.js";

/**
 * Build a straight-line segment centerline of `steps` evenly spaced points.
 * Keeps the rest of the file declarative so we can compose multi-side shapes
 * from simple segment descriptors.
 */
function lineCenterline(a, b, steps = 20) {
  const out = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/**
 * Flatten a list of corner points into one continuous centerline for the
 * whole shape (used for adherence / rendering fallback) and also return a
 * sibling `segments` array, one entry per side.  Framework §6.1 errorless
 * learning: exposing one side at a time gives the user discrete wins and
 * lets each segment have its own start dot / ghost preview.
 */
function polygonFromCorners(corners, perSide, labels, closed = true) {
  const centerline = [];
  const segments = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i];
    const b = corners[i + 1];
    const segLine = lineCenterline(a, b, perSide);
    segments.push({
      label: labels?.[i] ?? `side-${i + 1}`,
      start: { x: a.x, y: a.y },
      end: { x: b.x, y: b.y },
      centerline: segLine,
    });
    for (let k = 0; k <= perSide; k++) centerline.push(segLine[k]);
  }
  return { centerline, segments, closed };
}

function arcCenterline(cx, cy, r, startA, endA, steps = 18) {
  const out = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const a = startA + (endA - startA) * t;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}

function segmentedCircle(cx, cy, r, segmentCount = 4, stepsPerSegment = 18) {
  const segments = [];
  const centerline = [];
  const startA = -Math.PI / 2;
  for (let i = 0; i < segmentCount; i++) {
    const a0 = startA + (i / segmentCount) * Math.PI * 2;
    const a1 = startA + ((i + 1) / segmentCount) * Math.PI * 2;
    const segLine = arcCenterline(cx, cy, r, a0, a1, stepsPerSegment);
    segments.push({
      label: `arc-${i + 1}`,
      start: segLine[0],
      end: segLine[segLine.length - 1],
      centerline: segLine,
      closed: false,
    });
    for (let k = 0; k < segLine.length; k++) {
      // avoid duplicating the first point of the next segment in centerline
      if (i > 0 && k === 0) continue;
      centerline.push(segLine[k]);
    }
  }
  return { centerline, segments, closed: true };
}

export function generateCorridor(
  type,
  width,
  length,
  canvasWidth,
  canvasHeight
) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  if (type === "straight") {
    const a = { x: centerX - length / 2, y: centerY };
    const b = { x: centerX + length / 2, y: centerY };
    // IMPORTANT: use a dense centerline, not just [start,end].  Mode 2's
    // rail-projection logic advances by centerline index; with only 2 points
    // Stage 3 behaves like a binary jump (stuck at 0 then instantly 1),
    // which looks like "cursor never moves".  Dense sampling makes progress
    // continuous and matches Stage 4+ behavior.
    const centerline = lineCenterline(a, b, 80);
    return {
      type: "straight",
      start: a,
      end: b,
      width,
      centerline,
      segments: [{ label: "line", start: a, end: b, centerline }],
    };
  }

  if (type === "gentle-curve") {
    const centerline = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = centerX - length / 2 + t * length;
      const y = centerY + Math.sin(t * Math.PI) * 80;
      centerline.push({ x, y });
    }
    return {
      type: "gentle-curve",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      segments: [
        {
          label: "arc",
          start: centerline[0],
          end: centerline[centerline.length - 1],
          centerline,
        },
      ],
    };
  }

  if (type === "complex-curve") {
    const centerline = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = centerX - length / 2 + t * length;
      const y = centerY + Math.sin(t * Math.PI * 2) * 60;
      centerline.push({ x, y });
    }
    return {
      type: "complex-curve",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      segments: [
        {
          label: "curve",
          start: centerline[0],
          end: centerline[centerline.length - 1],
          centerline,
        },
      ],
    };
  }

  return null;
}

/**
 * Closed and construction shapes for framework stages 5-6.
 * All return a { type, start, end, width, centerline, closed? } descriptor.
 */
export function generateClosedShape(kind, width, canvasWidth, canvasHeight) {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const size = Math.min(canvasWidth, canvasHeight) * 0.32;

  if (kind === "circle") {
    // Split the circle into explicit arcs so the lesson has clear checkpoints
    // instead of one long ambiguous loop with same start/end.
    const { centerline, segments } = segmentedCircle(cx, cy, size, 4, 20);
    return {
      type: "circle",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      closed: true,
      segments,
    };
  }

  if (kind === "square") {
    const half = size;
    const corners = [
      { x: cx - half, y: cy - half },
      { x: cx + half, y: cy - half },
      { x: cx + half, y: cy + half },
      { x: cx - half, y: cy + half },
      { x: cx - half, y: cy - half },
    ];
    const { centerline, segments } = polygonFromCorners(
      corners,
      18,
      ["top", "right", "bottom", "left"],
    );
    return {
      type: "square",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      closed: true,
      segments,
    };
  }

  if (kind === "triangle") {
    const apex = { x: cx, y: cy - size };
    const bl = { x: cx - size * 0.92, y: cy + size * 0.6 };
    const br = { x: cx + size * 0.92, y: cy + size * 0.6 };
    const corners = [apex, br, bl, apex];
    const { centerline, segments } = polygonFromCorners(
      corners,
      22,
      ["right-side", "base", "left-side"],
    );
    return {
      type: "triangle",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      closed: true,
      segments,
    };
  }

  if (kind === "sun") {
    const r = size * 0.7;
    // Like circle, split sun body into explicit arc checkpoints.
    const { centerline, segments } = segmentedCircle(cx, cy, r, 4, 22);
    const rays = [];
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      rays.push({
        from: { x: cx + Math.cos(a) * (r + 20), y: cy + Math.sin(a) * (r + 20) },
        to: { x: cx + Math.cos(a) * (r + 60), y: cy + Math.sin(a) * (r + 60) },
      });
    }
    return {
      type: "sun",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      closed: true,
      decorations: { rays },
      segments: segments.map((s, i) => ({ ...s, label: `sun-arc-${i + 1}` })),
    };
  }

  if (kind === "kite") {
    const top = { x: cx, y: cy - size };
    const right = { x: cx + size * 0.75, y: cy };
    const bottom = { x: cx, y: cy + size * 1.1 };
    const left = { x: cx - size * 0.75, y: cy };
    const corners = [top, right, bottom, left, top];
    const { centerline, segments } = polygonFromCorners(
      corners,
      18,
      ["top-right", "bottom-right", "bottom-left", "top-left"],
    );
    return {
      type: "kite",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      closed: true,
      segments,
      decorations: {
        tail: [
          { x: bottom.x, y: bottom.y + 40 },
          { x: bottom.x - 20, y: bottom.y + 80 },
          { x: bottom.x + 20, y: bottom.y + 120 },
          { x: bottom.x - 20, y: bottom.y + 160 },
        ],
      },
    };
  }

  if (kind === "house") {
    const half = size * 0.9;
    const baseY = cy + half * 0.7;
    const topY = cy - half * 0.1;
    const roofY = cy - half * 0.95;
    const corners = [
      { x: cx - half, y: baseY },
      { x: cx + half, y: baseY },
      { x: cx + half, y: topY },
      { x: cx, y: roofY },
      { x: cx - half, y: topY },
      { x: cx - half, y: baseY },
    ];
    const { centerline, segments } = polygonFromCorners(
      corners,
      16,
      ["floor", "right-wall", "right-roof", "left-roof", "left-wall"],
    );
    return {
      type: "house",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
      closed: true,
      segments,
    };
  }

  return null;
}

export function isPointInCorridor(point, corridor) {
  if (!corridor?.centerline?.length) return false;
  let minDist = Infinity;
  for (const centerPoint of corridor.centerline) {
    const dist = Math.sqrt(
      Math.pow(point.x - centerPoint.x, 2) +
        Math.pow(point.y - centerPoint.y, 2)
    );
    if (dist < minDist) minDist = dist;
  }
  return minDist <= corridor.width / 2;
}

/**
 * Rich accuracy along the true polyline (not vertex-only distance).
 * `corridor.width` is the full allowed band; half is the scoring radius, matching in-lesson visual.
 */
export function computePathAccuracy(userPath, corridor) {
  if (!userPath?.length || !corridor?.centerline?.length) {
    return {
      adherence: 0,
      insideCount: 0,
      outsideCount: 0,
      sampleCount: 0,
      meanDeviation: 0,
    };
  }
  const n = userPath.length;
  const w = Math.max(1, (corridor.width ?? 20) / 2);
  let inside = 0;
  let sumDev = 0;
  let sumQuality = 0;
  for (const p of userPath) {
    const d = distanceToPath(p, corridor.centerline);
    sumDev += d;
    if (d <= w) inside++;
    // In-band: 1 at line, 0 at edge. Outside: steep extra penalty (drives score down)
    if (d <= w) {
      const q = 0.5 + 0.5 * (1 - d / w);
      sumQuality += q;
    } else {
      const over = d - w;
      sumQuality += Math.max(0, 0.5 * (1 - over / (w * 2.2)));
    }
  }
  const inPct = (inside / n) * 100;
  const meanDev = sumDev / n;
  const meanQual = (sumQuality / n) * 100;
  // Heavy weight on "time" inside the band + smooth closeness; off-path drags the mean quality down
  const adherence = Math.max(0, Math.min(100, Math.round(0.48 * inPct + 0.52 * meanQual)));
  return {
    adherence,
    insideCount: inside,
    outsideCount: n - inside,
    sampleCount: n,
    meanDeviation: meanDev,
  };
}

export function calculateAdherence(userPath, corridor) {
  return computePathAccuracy(userPath, corridor).adherence;
}
