import { UI_TOKENS } from "../../theme/uiTokens";

export const VISUAL_CORRIDOR_SCALE = 0.78;
export const TRACE_WIDTH = 10;
export const PREVIEW_COLOR = "rgba(100, 116, 139, 0.65)";

/** Six discrete quality bands (on-line → off-line). */
export const STROKE_QUALITY_HEX = [
  UI_TOKENS.lesson.successSoft,
  "#5EEAD4",
  "#A3E635",
  "#EAB308",
  "#F97316",
  UI_TOKENS.lesson.danger,
];

export function lessonPointInsideCanvas(px, py, vp) {
  if (!vp) return false;
  return px >= vp.left && px <= vp.right && py >= vp.top && py <= vp.bottom;
}

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
    const t = Math.max(
      Math.min(5, Math.max(0, tiers[i] ?? def)),
      Math.min(5, Math.max(0, tiers[i + 1] ?? def)),
    );
    ctx.strokeStyle = STROKE_QUALITY_HEX[t];
    ctx.beginPath();
    ctx.moveTo(centerline[i].x, centerline[i].y);
    ctx.lineTo(centerline[i + 1].x, centerline[i + 1].y);
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
  const tier = qualityTierFromDistance(dist, ths);
  const hex = STROKE_QUALITY_HEX[tier].replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
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
