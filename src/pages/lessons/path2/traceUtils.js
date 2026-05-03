import { UI_TOKENS } from "../../../theme/uiTokens";

export const VISUAL_CORRIDOR_SCALE = 0.78;
export const TRACE_WIDTH = 10;
export const PREVIEW_COLOR = "rgba(100, 116, 139, 0.65)";

/**
 * Accuracy ramp (index 0 = on-line / EXCELLENT … index 5 = BAD), aligned to the
 * product reference: bright green → lime → yellow → orange → coral → red.
 */
export const STROKE_QUALITY_HEX = [
  "#22C55E",
  "#84CC16",
  "#EAB308",
  "#F97316",
  "#FB923C",
  "#DC2626",
];

function parseStrokeHex(hex) {
  const h = String(hex).trim().replace("#", "");
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return { r: 34, g: 184, b: 146 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixRgb(a, b, f) {
  const t = Math.min(1, Math.max(0, f));
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgbToHexStr({ r, g, b }) {
  return `#${[r, g, b]
    .map((x) => {
      const v = Math.min(255, Math.max(0, x));
      return v.toString(16).padStart(2, "0");
    })
    .join("")}`;
}

/**
 * Maps distance / corridor half-width to 0 (excellent, on path) → 1 (worst).
 * Soft curve keeps the “green” band forgiving; values >1 still grade into red.
 */
export function accuracyGradientT(dist, threshold) {
  const ths = Math.max(0.5, threshold);
  const n = dist / ths;
  const capped = Math.min(1.45, Math.max(0, n));
  return Math.min(1, Math.pow(capped / 1.45, 0.88));
}

/** Smooth hex along EXCELLENT→BAD stops (no discrete tier jumps in hue). */
export function strokeHexFromAccuracyGradient(dist, threshold) {
  const stops = STROKE_QUALITY_HEX.map(parseStrokeHex);
  const u = accuracyGradientT(dist, threshold);
  const pos = u * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const frac = pos - i;
  return rgbToHexStr(mixRgb(stops[i], stops[i + 1], frac));
}

export function rgbFromAccuracyGradient(dist, threshold) {
  return parseStrokeHex(strokeHexFromAccuracyGradient(dist, threshold));
}

/**
 * Continuous fill for adherence UI: 100% adherence = best stop, 0% = worst.
 */
export function adherenceBarColorFromStrokeScale(adherencePct) {
  const stops = STROKE_QUALITY_HEX.map(parseStrokeHex);
  const t = Math.min(1, Math.max(0, Number(adherencePct) / 100));
  const pos = (1 - t) * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const frac = pos - i;
  return rgbToHexStr(mixRgb(stops[i], stops[i + 1], frac));
}

export { lessonPointInsideCanvas } from "../../../utils/lessonCanvasViewport";

export function qualityTierFromDistance(dist, th) {
  const ths = Math.max(0.5, th);
  const n = dist / ths;
  if (n <= 0.32) return 0;
  if (n <= 0.5) return 1;
  if (n <= 0.65) return 2;
  if (n <= 0.82) return 3;
  if (n <= 1) return 4;
  return 5;
}

/** `"r, g, b"` for the universal cursor ghost trail — matches smooth stroke colour. */
export function trailRgbCsvFromDistance(dist, th) {
  const { r, g, b } = rgbFromAccuracyGradient(dist, th);
  return `${r}, ${g}, ${b}`;
}

export function drawCenterlineByTiers(ctx, centerline, vertexTiers, lineWidth) {
  const L = centerline.length;
  if (L < 2) return;
  const def = 2;
  const tiers =
    Array.isArray(vertexTiers) && vertexTiers.length === L
      ? vertexTiers
      : Array(L).fill(def);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < L - 1; i++) {
    const t0 = Math.max(0, Math.min(5, tiers[i] ?? def));
    const t1 = Math.max(0, Math.min(5, tiers[i + 1] ?? def));
    const p0 = centerline[i];
    const p1 = centerline[i + 1];
    const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    g.addColorStop(0, STROKE_QUALITY_HEX[t0]);
    g.addColorStop(1, STROKE_QUALITY_HEX[t1]);
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

export function path2FillBackgroundAndRoad(ctx, canvas, c, segs) {
  ctx.fillStyle = UI_TOKENS.lesson.canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (c.closed && segs.length === 1) {
    ctx.fillStyle = "rgba(99,102,241,0.06)";
    ctx.beginPath();
    ctx.moveTo(c.centerline[0].x, c.centerline[0].y);
    for (const p of c.centerline) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
  ctx.lineWidth = Math.max(18, c.width * VISUAL_CORRIDOR_SCALE);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.1;
  for (const s of segs) {
    if (!s.centerline?.length) continue;
    ctx.beginPath();
    ctx.moveTo(s.centerline[0].x, s.centerline[0].y);
    for (let i = 1; i < s.centerline.length; i++) {
      ctx.lineTo(s.centerline[i].x, s.centerline[i].y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function path2DrawDecorations(ctx, c) {
  if (c.decorations?.rays) {
    for (const r of c.decorations.rays) {
      ctx.strokeStyle = UI_TOKENS.lesson.warning;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(r.from.x, r.from.y);
      ctx.lineTo(r.to.x, r.to.y);
      ctx.stroke();
    }
  }
  if (c.decorations?.tail) {
    ctx.strokeStyle = UI_TOKENS.lesson.ghost;
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    const t0 = c.decorations.tail[0];
    ctx.moveTo(t0.x, t0.y);
    for (const p of c.decorations.tail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function normalizePathToSegmentStart(path, seg) {
  if (!Array.isArray(path) || path.length === 0 || !seg?.start) return path;
  const first = path[0];
  const offsetX = seg.start.x - first.x;
  const offsetY = seg.start.y - first.y;
  return path.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
}

export function effectiveScoringWidth(width) {
  return Math.max(10, width + 8);
}

export function wobbleBeadColor(intensity, baseAlpha) {
  const TRACE_WARN = { r: 245, g: 158, b: 11 };
  const TRACE_BAD = { r: 220, g: 38, b: 38 };
  const t = Math.min(1, 0.2 + 0.8 * (intensity ?? 0));
  const rgb = {
    r: Math.round(TRACE_WARN.r + (TRACE_BAD.r - TRACE_WARN.r) * t),
    g: Math.round(TRACE_WARN.g + (TRACE_BAD.g - TRACE_WARN.g) * t),
    b: Math.round(TRACE_WARN.b + (TRACE_BAD.b - TRACE_WARN.b) * t),
  };
  return { ...rgb, alpha: baseAlpha };
}

export function buildVertexQualityFills(raw, thDef, L) {
  if (L < 2) return [];
  const f = new Array(L);
  f[0] = raw?.[0] ?? { dist: 0, threshold: thDef };
  for (let i = 1; i < L; i++) {
    f[i] = raw?.[i] ?? f[i - 1];
  }
  return f;
}

export function traceSampleStyleFromDistance(dist, th, baseAlpha) {
  const ths = Math.max(th, 0.5);
  const norm = dist / ths;
  const { r, g, b } = rgbFromAccuracyGradient(dist, ths);
  if (norm <= 1) {
    const fInner = norm <= 0.8 ? 1 - norm / 0.8 : 0;
    return {
      style: { r, g, b, alpha: baseAlpha },
      q: fInner,
      inGreenOnlyZone: norm <= 0.8,
    };
  }
  const past = dist - ths;
  const falloff = ths * 2.2;
  const extraOp = 0.5 * (1 - Math.exp(-past / falloff));
  return {
    style: { r, g, b, alpha: Math.min(0.95, baseAlpha + extraOp) },
    q: 0,
    inGreenOnlyZone: false,
  };
}
