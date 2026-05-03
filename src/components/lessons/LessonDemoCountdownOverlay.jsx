/**
 * Floating “Get ready” card with conic countdown ring — Path 1 + Path 2 demo phase.
 */
export default function LessonDemoCountdownOverlay({
  countdown,
  countdownProgress,
  language,
  subtitle,
}) {
  if (countdown == null) return null;
  return (
    <div className="fixed top-[230px] left-1/2 z-30 -translate-x-1/2 pointer-events-none">
      <div
        className="rounded-3xl border bg-white/95 px-5 py-4 shadow-2xl backdrop-blur-sm"
        style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 35%, transparent)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="grid h-20 w-20 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--easeL-primary) ${
                Math.max(0, Math.min(1, countdownProgress)) * 360
              }deg, rgba(148,163,184,0.25) 0deg)`,
            }}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white">
              <span className="easeL-accent-text-strong text-4xl font-extrabold tabular-nums">
                {countdown}
              </span>
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {language === "ur" ? "تیار ہو جائیں" : "Get ready"}
            </p>
            <p className="text-lg font-extrabold text-slate-800">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
