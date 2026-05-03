import { Volume2, VolumeX, RefreshCw, LogOut } from "lucide-react";

/**
 * Recenter / sound / exit — shared by Path 1 (large touch targets) and Path 2
 * (compact, often inside a fade-in caregiver strip).
 */
export default function LessonToolbar({
  language,
  muted,
  onToggleMute,
  onRecenter,
  onExit,
  buttonRefs,
  size = "comfort",
}) {
  const isComfort = size === "comfort";
  const btn =
    "easeL-btn-outline inline-flex items-center gap-2 font-bold transition hover:opacity-95";
  const dim = isComfort ? "min-h-14 gap-2 px-6 text-lg" : "min-h-11 gap-1.5 px-3.5 text-sm font-semibold";
  const exitBtn =
    "inline-flex items-center gap-2 rounded-2xl border-2 font-bold transition hover:opacity-95";
  const exitDim = isComfort ? "min-h-14 gap-2 px-6 text-lg rounded-2xl" : "min-h-11 gap-1.5 px-4 text-sm rounded-xl";

  return (
    <>
      <button
        type="button"
        ref={(el) => {
          if (buttonRefs?.current) buttonRefs.current.recenter = el;
        }}
        onClick={onRecenter}
        className={`${btn} ${dim}`}
        title="Recenter cursor"
      >
        <RefreshCw className={isComfort ? "w-5 h-5" : "h-4 w-4"} />
        {language === "ur" ? "مرکز" : "Recenter"}
      </button>
      <button
        type="button"
        ref={(el) => {
          if (buttonRefs?.current) buttonRefs.current.mute = el;
        }}
        onClick={onToggleMute}
        className={`${btn} ${dim}`}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className={isComfort ? "w-5 h-5" : "h-4 w-4"} /> : <Volume2 className={isComfort ? "w-5 h-5" : "h-4 w-4"} />}
        {language === "ur" ? (muted ? "آواز بند" : "آواز") : muted ? "Muted" : "Sound"}
      </button>
      <button
        type="button"
        ref={(el) => {
          if (buttonRefs?.current) buttonRefs.current.exit = el;
        }}
        onClick={onExit}
        className={`${exitBtn} ${exitDim}`}
        style={{
          background: "var(--easeL-bg-section-alt)",
          borderColor: "var(--easeL-border-strong)",
          color: "var(--easeL-text)",
        }}
      >
        <LogOut className={isComfort ? "h-5 w-5" : "h-5 w-5"} />
        {language === "ur" ? "ختم" : "Exit"}
      </button>
    </>
  );
}
