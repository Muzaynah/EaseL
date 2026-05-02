/**
 * Framework §6.2 and §9.3: mandatory, user-pauseable break overlay.
 * Shown when `useSessionTimer` fires its break interval, and when the cap is reached.
 */
export default function BreakPrompt({ kind, onResume, onExit, language = "en" }) {
  const isCap = kind === "cap";
  const title =
    language === "ur"
      ? isCap
        ? "بہت محنت کی!"
        : "تھوڑا آرام کریں"
      : isCap
      ? "You worked hard!"
      : "Time for a little break";
  const body =
    language === "ur"
      ? isCap
        ? "آج کا سیشن مکمل ہو گیا۔ بعد میں پھر آئیں۔"
        : "سانس لیں اور تیار ہونے پر جاری رکھیں۔"
      : isCap
      ? "Today's session is complete. Come back later to continue."
      : "Take a breath. When you're ready, carry on.";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--easeL-ink) 38%, transparent)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-prompt-title"
    >
      <div
        className="animate-fade-scale-in w-full max-w-md rounded-3xl border-2 p-6 text-center sm:p-8"
        style={{
          borderColor: "var(--easeL-border-strong)",
          background: "var(--easeL-bg-section)",
          boxShadow: "var(--easeL-cartoon-shadow)",
        }}
      >
        <h2 id="break-prompt-title" className="easeL-heading-2 mb-2 text-balance" style={{ color: "var(--easeL-ink)" }}>
          {title}
        </h2>
        <p className="mb-6 text-base leading-relaxed sm:text-[1.05rem]" style={{ color: "var(--easeL-text-muted)" }}>
          {body}
        </p>
        <div className="flex flex-col gap-3">
          {!isCap && (
            <button type="button" onClick={onResume} className="easeL-btn-solid min-h-12 w-full justify-center text-base font-semibold sm:min-h-14 sm:text-lg">
              {language === "ur" ? "جاری رکھیں" : "Continue"}
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="easeL-btn-outline min-h-12 w-full justify-center text-base font-semibold sm:min-h-14 sm:text-lg"
          >
            {language === "ur" ? "سیشن ختم" : "Finish session"}
          </button>
        </div>
      </div>
    </div>
  );
}
