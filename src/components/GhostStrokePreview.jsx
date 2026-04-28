import { useEffect, useRef } from "react";

/**
 * Framework §6.1 "demonstration-first": animated preview of the target stroke
 * shown before the user acts. Draws on top of the provided canvas ref. On
 * `onDone` the caller clears the canvas and starts the trial.
 *
 * The preview fades out once the animation finishes so residual ink does not
 * distract the learner. The caller is still responsible for drawing the
 * corridor/path behind the preview (it layers on top).
 */
export default function GhostStrokePreview({
  canvasRef,
  centerline,
  durationMs = 1200,
  color = "#a855f7",
  lineWidth = 10,
  active,
  drawBackdrop,
  onDone,
  maxAlpha = 0.45,
}) {
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef?.current || !centerline?.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    startRef.current = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const head = ease * (centerline.length - 1);
      const lastI = Math.floor(head);

      if (drawBackdrop) {
        drawBackdrop(ctx);
      } else {
        ctx.fillStyle = "#FAFAFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      // Quick fade-out past 70% so the preview reads as a fleeting hint, not
      // residual ink the user has to mentally subtract.
      const fadeIn = Math.min(1, t / 0.1);
      const fadeOut = 1 - Math.max(0, (t - 0.7) / 0.3);
      ctx.globalAlpha = maxAlpha * fadeIn * fadeOut;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(centerline[0].x, centerline[0].y);
      for (let i = 1; i <= lastI && i < centerline.length; i++) {
        ctx.lineTo(centerline[i].x, centerline[i].y);
      }
      if (head > lastI && lastI + 1 < centerline.length) {
        const frac = head - lastI;
        const a = centerline[lastI];
        const b = centerline[lastI + 1];
        ctx.lineTo(a.x + frac * (b.x - a.x), a.y + frac * (b.y - a.y));
      }
      ctx.stroke();

      const hx =
        head >= centerline.length - 1
          ? centerline[centerline.length - 1].x
          : centerline[lastI].x +
            (head - lastI) * (centerline[lastI + 1].x - centerline[lastI].x);
      const hy =
        head >= centerline.length - 1
          ? centerline[centerline.length - 1].y
          : centerline[lastI].y +
            (head - lastI) * (centerline[lastI + 1].y - centerline[lastI].y);
      // Slightly brighter head dot so the user can still track the preview
      // direction even at low alpha.
      ctx.globalAlpha = Math.min(1, maxAlpha * 1.6) * fadeIn * fadeOut;
      ctx.beginPath();
      ctx.arc(hx, hy, lineWidth * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (onDone) {
        onDone();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, canvasRef, centerline, durationMs, color, lineWidth, drawBackdrop, onDone, maxAlpha]);

  return null;
}
