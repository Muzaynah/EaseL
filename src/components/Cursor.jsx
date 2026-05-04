// components/Cursor.jsx
import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import { UI_TOKENS } from "../theme/uiTokens";

/** Below max 32-bit signed int so fixed layers stay sane on all screens */
export const EASEL_CURSOR_DOT_Z = 2_147_483_640;
export const EASEL_CURSOR_TRAIL_Z = 2_147_483_630;

function hexToRgbCsv(hex, fallbackCsv) {
  if (typeof hex !== "string") return fallbackCsv;
  const clean = hex.trim().replace("#", "");
  if (!/^[\da-fA-F]{6}$/.test(clean)) return fallbackCsv;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Universal cursor tone (dark green across head + trail). */
const UNIVERSAL_CURSOR_RGB = hexToRgbCsv(UI_TOKENS.app?.primary, "61, 31, 122");
const UNIVERSAL_CURSOR_FILL_ACTIVE = `rgba(${UNIVERSAL_CURSOR_RGB}, 0.62)`;
const UNIVERSAL_CURSOR_FILL_IDLE = "rgba(255, 255, 255, 0.9)";
const UNIVERSAL_CURSOR_BORDER_ACTIVE = "rgba(255, 255, 255, 0.96)";
const UNIVERSAL_CURSOR_BORDER_IDLE = `rgba(${UNIVERSAL_CURSOR_RGB}, 0.92)`;
const UNIVERSAL_CURSOR_SHADOW_ACTIVE = `0 0 0 3px rgba(255, 255, 255, 0.92), 0 0 32px rgba(${UNIVERSAL_CURSOR_RGB}, 0.9), 0 0 18px rgba(${UNIVERSAL_CURSOR_RGB}, 0.55), 0 6px 20px rgba(${UNIVERSAL_CURSOR_RGB}, 0.22)`;
const UNIVERSAL_CURSOR_SHADOW_IDLE = `0 0 0 2px rgba(255, 255, 255, 0.98), 0 0 26px rgba(${UNIVERSAL_CURSOR_RGB}, 0.78), 0 0 16px rgba(${UNIVERSAL_CURSOR_RGB}, 0.52)`;

/** Shorter trail + coarser sampling = fewer canvas strokes per frame (less jank). */
const TRAIL_MAX_POINTS = 8;
const TRAIL_MIN_STEP_PX = 3.2;
const TRAIL_RESET_JUMP_PX = 140;
/** Cap backing-store scale so HiDPI does not multiply clear+stroke cost unnecessarily. */
const TRAIL_CANVAS_MAX_DPR = 2;

/** Basis for taper math (`wMax` = thickest stroke; head matches this width exactly) */
const CONE_REF_SCALE = 0.86;

/** From reference diameter: head dot and trail stroke width match `wMax`. */
function coneStrokeExtents(refDiameterPx) {
  const wMax = Math.max(6, refDiameterPx * 0.52);
  return { wMax };
}

function mergeRefs(node, forwarded) {
  if (typeof forwarded === "function") forwarded(node);
  else if (forwarded) forwarded.current = node;
}

/**
 * Constant-width stroke; opacity rises from oldest sample → newest (fading line).
 * `lineWidthPx` comes from the head dot sizing so stroke and head stay aligned.
 */
function drawTrailSegments(ctx, points, lineWidthPx, rgbCsv = UNIVERSAL_CURSOR_RGB) {
  if (points.length < 2) return;
  const n = points.length;
  const denom = Math.max(n - 1, 1);
  /** 0 = oldest (faintest), 1 = at head (strongest) */
  const alphaAt = (idx) => {
    const t = idx / denom;
    return 0.04 + t * 0.62;
  };

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = lineWidthPx;
  for (let i = 0; i < n - 1; i++) {
    const a = (alphaAt(i) + alphaAt(i + 1)) / 2;
    ctx.strokeStyle = `rgba(${rgbCsv}, ${Math.min(0.78, a)})`;
    ctx.beginPath();
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[i + 1].x, points[i + 1].y);
    ctx.stroke();
  }
}

const Cursor = forwardRef(
  (
    {
      size,
      isPenDown,
      tool,
      left,
      top,
      variant = "default",
      /** Optional outer wrapper ref (trail + circle) — e.g. for visibility on lesson pages */
      bundleRef = null,
      /** Lesson bridge ref: `current.trailAccentRgb` overrides ghost-trail colour (Mode 2 accuracy). */
      accentBridgeRef = null,
    },
    ref
  ) => {
    const innerRef = useRef(null);
    const trailCanvasRef = useRef(null);
    const trailPointsRef = useRef([]);
    const coneDiameterRef = useRef(0);
    const trailLineWidthRef = useRef(8);
    const trailLastAccentRef = useRef("");

    // Keep cursor geometry uniform across lesson/global and canvas contexts.
    const pad = 6;
    const coneRefDiameterPx = (size + pad) * CONE_REF_SCALE;
    const { wMax } = coneStrokeExtents(coneRefDiameterPx);
    /** Matches thickest stroke; outline read as continuation of taper */
    const headTipDiameterPx = wMax;
    const headDiameterCss = isPenDown ? headTipDiameterPx : headTipDiameterPx * 0.92;
    coneDiameterRef.current = coneRefDiameterPx;
    trailLineWidthRef.current = wMax;

    const setRefs = useCallback(
      (node) => {
        innerRef.current = node;
        mergeRefs(node, ref);
      },
      [ref]
    );

    const setBundleRef = useCallback(
      (node) => {
        if (bundleRef) bundleRef.current = node;
      },
      [bundleRef]
    );

    useEffect(() => {
      const canvas = trailCanvasRef.current;
      if (!canvas) return undefined;

      let trailDpr = 1;
      const syncSize = () => {
        trailDpr = Math.min(TRAIL_CANVAS_MAX_DPR, window.devicePixelRatio || 1);
        canvas.width = Math.round(window.innerWidth * trailDpr);
        canvas.height = Math.round(window.innerHeight * trailDpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
      };

      syncSize();
      const ctx = canvas.getContext("2d", {
        alpha: true,
        desynchronized: true,
      });
      if (!ctx) return undefined;

      /** @returns {boolean} whether polyline data changed (needs redraw) */
      const pushPoint = (nx, ny) => {
        const pts = trailPointsRef.current;
        const last = pts[pts.length - 1];
        if (!last) {
          pts.push({ x: nx, y: ny });
          return true;
        }
        const d = Math.hypot(nx - last.x, ny - last.y);
        if (d > TRAIL_RESET_JUMP_PX) {
          trailPointsRef.current = [{ x: nx, y: ny }];
          return true;
        }
        if (d < TRAIL_MIN_STEP_PX) return false;
        pts.push({ x: nx, y: ny });
        while (pts.length > TRAIL_MAX_POINTS) pts.shift();
        return true;
      };

      const onResize = () => {
        trailPointsRef.current = [];
        syncSize();
      };
      window.addEventListener("resize", onResize);

      let rafId = 0;
      const tick = () => {
        const el = innerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const trailChanged = pushPoint(cx, cy);
          const accentCsv =
            variant === "lesson" && accentBridgeRef?.current?.trailAccentRgb
              ? accentBridgeRef.current.trailAccentRgb
              : UNIVERSAL_CURSOR_RGB;
          const accentChanged =
            variant === "lesson" &&
            accentBridgeRef &&
            accentCsv !== trailLastAccentRef.current;
          trailLastAccentRef.current = accentCsv;

          if (trailChanged || accentChanged) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(trailDpr, 0, 0, trailDpr, 0, 0);
            drawTrailSegments(
              ctx,
              trailPointsRef.current,
              trailLineWidthRef.current,
              accentCsv,
            );
          }
        }

        rafId = window.requestAnimationFrame(tick);
      };

      rafId = window.requestAnimationFrame(tick);

      return () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
      };
    }, [variant, accentBridgeRef]);

    const positionStyle =
      left != null && top != null
        ? {
            left: typeof left === "number" ? `${left}px` : left,
            top: typeof top === "number" ? `${top}px` : top,
          }
        : {};

    let circleStyle;

    if (tool === "eraser" && isPenDown) {
      circleStyle = {
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        boxShadow:
          "0 0 10px rgba(255, 255, 255, 0.5), 0 2px 10px rgba(20, 12, 36, 0.16)",
        borderColor: `rgba(${UNIVERSAL_CURSOR_RGB}, 0.24)`,
      };
    } else if (isPenDown) {
      circleStyle = {
        backgroundColor: UNIVERSAL_CURSOR_FILL_ACTIVE,
        boxShadow: UNIVERSAL_CURSOR_SHADOW_ACTIVE,
        borderColor: UNIVERSAL_CURSOR_BORDER_ACTIVE,
      };
    } else {
      circleStyle = {
        backgroundColor: UNIVERSAL_CURSOR_FILL_IDLE,
        boxShadow: UNIVERSAL_CURSOR_SHADOW_IDLE,
        borderColor: UNIVERSAL_CURSOR_BORDER_IDLE,
      };
    }

    return (
      <div
        ref={setBundleRef}
        className="pointer-events-none isolate"
        style={{ zIndex: EASEL_CURSOR_DOT_Z, position: "relative" }}
        aria-hidden="true"
      >
        <canvas
          ref={trailCanvasRef}
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{ zIndex: EASEL_CURSOR_TRAIL_Z, width: "100%", height: "100%" }}
        />
        <div
          ref={setRefs}
          className="fixed pointer-events-none rounded-full border border-solid"
          style={{
            ...positionStyle,
            width: headDiameterCss,
            height: headDiameterCss,
            transform: "translate(-50%, -50%)",
            zIndex: EASEL_CURSOR_DOT_Z,
            backgroundColor: circleStyle.backgroundColor,
            boxShadow: circleStyle.boxShadow,
            borderColor: circleStyle.borderColor,
            borderWidth: "1px",
          }}
        />
      </div>
    );
  }
);

Cursor.displayName = "Cursor";

export default React.memo(Cursor);
