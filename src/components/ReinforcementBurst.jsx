import { useEffect, useMemo, useRef } from "react";

/**
 * Framework §3.5 + §8.3: immediate positive reinforcement after every completed
 * attempt regardless of accuracy. Short (~1.2 s), non-interrupting, low-stimulation
 * when the caller opts in. The component paints its own canvas starburst so no
 * external dependencies are needed.
 */
export default function ReinforcementBurst({
  active,
  duration = 1200,
  lowStimulation = false,
  onDone,
}) {
  const canvasRef = useRef(null);
  const startRef = useRef(null);

  const particles = useMemo(() => {
    if (!active) return null;
    const count = lowStimulation ? 14 : 32;
    const arr = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 110 + Math.random() * 140;
      arr.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        hue: lowStimulation
          ? 215
          : [46, 198, 276, 12, 160][i % 5],
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
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
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
        const dx = p.vx * (progress * duration) / 1000;
        const dy = p.vy * (progress * duration) / 1000 + 120 * progress * progress;
        const alpha = 1 - progress;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue} 90% 60%)`;
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, p.size * (1 - progress * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else if (onDone) {
        onDone();
      }
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, particles, duration, lowStimulation, onDone]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
