import { useEffect, useMemo, useRef } from "react";

/**
 * Sprinkles radiating from the center of a local region (e.g. around a score).
 * No full-screen overlay and no “Great try” card — only particle animation.
 */
export default function ScoreSprinkles({ active, duration = 800, lowStimulation = false }) {
  const canvasRef = useRef(null);
  const startRef = useRef(null);

  const particles = useMemo(() => {
    if (!active) return null;
    const count = lowStimulation ? 12 : 28;
    const arr = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 70 + Math.random() * 100;
      arr.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        hue: lowStimulation ? 200 : [46, 198, 276, 160, 12][i % 5],
        life: 1,
      });
    }
    return arr;
  }, [active, lowStimulation]);

  useEffect(() => {
    if (!active || !particles) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    startRef.current = performance.now();
    let raf;
    const tick = (now) => {
      const t = now - startRef.current;
      const progress = Math.min(1, t / duration);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      for (const p of particles) {
        const dx = (p.vx * (progress * duration)) / 1000;
        const dy = (p.vy * (progress * duration)) / 1000 + 90 * progress * progress;
        const alpha = 1 - progress;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue} 88% 58%)`;
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, p.size * (1 - progress * 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, particles, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden
    />
  );
}
