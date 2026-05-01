import { Coffee } from "lucide-react";

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
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="easeL-card max-w-md w-full p-8 text-center animate-fade-scale-in">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white mb-4">
          <Coffee className="w-10 h-10" />
        </div>
        <h2 className="easeL-heading-2 mb-2">{title}</h2>
        <p className="easeL-text-muted mb-6">{body}</p>
        <div className="flex flex-col gap-3">
          {!isCap && (
            <button
              type="button"
              onClick={onResume}
              className="easeL-btn-solid min-h-14 text-lg transition-all"
            >
              {language === "ur" ? "جاری رکھیں" : "Continue"}
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="easeL-interactive min-h-14 rounded-2xl border-2 border-slate-300 text-slate-700 font-semibold text-lg hover:bg-slate-50"
          >
            {language === "ur" ? "سیشن ختم" : "Finish session"}
          </button>
        </div>
      </div>
    </div>
  );
}
