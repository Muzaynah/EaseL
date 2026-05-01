import { AlertCircle } from "lucide-react";

export default function SetupFailureCard({
  title,
  subtitle,
  summary,
  guidance = [],
  primaryLabel = "Try again",
  secondaryLabel = "Exit for now",
  onPrimary,
  onSecondary,
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center easeL-page-bg pt-24 px-6">
      <div className="max-w-lg w-full bg-white/95 backdrop-blur-md rounded-3xl p-10 shadow-2xl border-2 border-amber-200 text-center animate-fade-scale-in">
        <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center text-white mx-auto mb-6">
          <AlertCircle className="w-14 h-14" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">{title}</h1>
        {subtitle ? (
          <p className="text-xl font-semibold text-amber-700 mb-2">{subtitle}</p>
        ) : null}
        {summary ? <p className="text-lg text-slate-600 mb-5">{summary}</p> : null}
        {guidance.length > 0 ? (
          <ul className="mb-8 list-inside list-disc space-y-1 text-sm text-left" style={{ color: "var(--easeL-text-muted)" }}>
            {guidance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onPrimary}
            className="min-h-14 px-8 easeL-btn-solid rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[color:var(--easeL-focus-ring)]"
          >
            {primaryLabel}
          </button>
          <button
            onClick={onSecondary}
            className="min-h-14 rounded-2xl border-4 border-[color:var(--easeL-primary)] px-8 text-lg font-bold text-[color:var(--easeL-primary)] transition-all hover:scale-[1.02] hover:border-[color:var(--easeL-primary-mid)] hover:bg-[color-mix(in_srgb,var(--easeL-primary)_10%,white)] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[color:var(--easeL-focus-ring)]"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
