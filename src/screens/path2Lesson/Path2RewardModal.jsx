import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Home,
  RotateCcw,
  Save,
} from "lucide-react";
import ScoreSprinkles from "../../components/ScoreSprinkles";
import { UI_TOKENS } from "../../theme/uiTokens";

export default function Path2RewardModal({
  language,
  title,
  lessonTotal,
  lessonIdx,
  variantPretty,
  activeVariantKey,
  finishedPayload,
  scoreSprinklesOn,
  lowStim,
  scoreRevealMs,
  gaugeRadius,
  gaugeCircumference,
  scoreGaugeProgress,
  passMarkerX,
  passMarkerY,
  stageUnlockAdherence,
  masteryProgressVisual,
  stage,
  saved,
  onSaveToGallery,
  onNextAttempt,
  onNavigateUnlock,
  onNavigateNextStage,
  onNavigateHome,
  onBackToLessons,
}) {
  return (
    <div className="easeL-result-overlay fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
      <div
        className="easeL-result-modal flex max-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <div
          className="easeL-result-header shrink-0 px-5 pb-3 pt-4 text-center"
        >
          <h2
            id="result-title"
            className="text-xl font-extrabold tracking-tight sm:text-2xl"
            style={{ color: "var(--easeL-text)" }}
          >
            {language === "ur"
              ? finishedPayload.passed
                ? "بہت اچھا!"
                : "مکمل!"
              : finishedPayload.passed
              ? "Nice work!"
              : "All done!"}
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm" style={{ color: "var(--easeL-text-muted)" }}>
            {title}
            {lessonTotal > 1
              ? language === "ur"
                ? ` · سبق ${lessonIdx}: ${variantPretty || activeVariantKey || ""}`
                : ` · Lesson ${lessonIdx}: ${variantPretty || activeVariantKey || ""}`
              : activeVariantKey
              ? ` · ${variantPretty || activeVariantKey}`
              : ""}
          </p>
        </div>

        <div className="relative shrink-0 px-5 py-5 text-center">
          <div className="relative mx-auto w-full max-w-sm min-h-[8.5rem] flex flex-col items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 w-full max-h-36 pointer-events-none">
              <ScoreSprinkles
                active={scoreSprinklesOn}
                lowStimulation={lowStim}
                duration={scoreRevealMs}
              />
            </div>
            <div className="relative z-10">
              <p className="mb-0.5 text-[10px] font-bold sm:text-xs" style={{ color: "var(--easeL-text-muted)" }}>
                {language === "ur" ? "آپ کا نمبر" : "Your score"}
              </p>
              <div className="mx-auto mt-1 h-40 w-40">
                <svg viewBox="0 0 160 160" className="h-full w-full">
                  <circle
                    cx="80"
                    cy="80"
                    r={gaugeRadius}
                    fill="none"
                    stroke={UI_TOKENS.lesson.gaugeTrack}
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={gaugeRadius}
                    fill="none"
                    stroke={finishedPayload.passed ? UI_TOKENS.lesson.gaugePass : UI_TOKENS.lesson.warning}
                    strokeWidth="12"
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeCircumference * (1 - scoreGaugeProgress)}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                  <circle cx={passMarkerX} cy={passMarkerY} r="4.5" fill={UI_TOKENS.lesson.gaugeMarker} />
                  <text x="80" y="86" textAnchor="middle" className="text-[28px] font-black tabular-nums" fill="var(--easeL-text)">
                    {finishedPayload.adherence}%
                  </text>
                </svg>
              </div>
              <p
                className="-mt-1 text-sm font-bold"
                style={{
                  color: finishedPayload.passed ? "var(--easeL-accent-mint)" : "var(--easeL-accent-coral)",
                }}
              >
                {finishedPayload.passed
                  ? language === "ur"
                    ? "کلیئر ہو گیا"
                    : "Cleared"
                  : language === "ur"
                  ? "ابھی نہیں"
                  : "Not quite yet"}
              </p>
            </div>
          </div>
          <div
            className="mt-3 rounded-lg border px-3 py-2 text-[11px] font-semibold"
            style={
              finishedPayload.unlockQualified
                ? {
                    background: "color-mix(in srgb, var(--easeL-accent-mint) 14%, white)",
                    borderColor: "color-mix(in srgb, var(--easeL-accent-mint) 48%, white)",
                    color: "color-mix(in srgb, var(--easeL-accent-mint) 78%, black)",
                  }
                : {
                    background: "color-mix(in srgb, var(--easeL-accent-coral) 12%, white)",
                    borderColor: "color-mix(in srgb, var(--easeL-accent-coral) 42%, white)",
                    color: "color-mix(in srgb, var(--easeL-accent-coral) 82%, black)",
                  }
            }
          >
            {language === "ur" ? "پیش رفت" : "Progression"}:{" "}
            {finishedPayload.unlockQualified
              ? language === "ur"
                ? "اگلا مرحلہ کھل گیا"
                : "next stage unlocked"
              : language === "ur"
              ? `مزید ${stageUnlockAdherence}% درکار`
              : `need ${stageUnlockAdherence}% to unlock next stage`}
            {" · "}
            {language === "ur" ? "پاس حد" : "pass mark"} {finishedPayload.requiredAdherence}%
          </div>
          {finishedPayload.masteryProgress ? (
            <div className="easeL-result-subtle mt-4 px-3 py-3 text-left">
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold" style={{ color: "var(--easeL-text-muted)" }}>
                <span>{language === "ur" ? "مہارت کی پیش رفت" : "Mastery progress"}</span>
                <span className="tabular-nums">
                  {finishedPayload.masteryProgress.after >
                  finishedPayload.masteryProgress.before ? (
                    <>
                      {finishedPayload.masteryProgress.before}/
                      {finishedPayload.masteryProgress.target}
                      {" -> "}
                      {finishedPayload.masteryProgress.after}/
                      {finishedPayload.masteryProgress.target}
                    </>
                  ) : (
                    <>
                      {finishedPayload.masteryProgress.after}/
                      {finishedPayload.masteryProgress.target}
                      {" · "}
                      {language === "ur" ? "کوئی اضافہ نہیں" : "no gain this attempt"}
                    </>
                  )}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--easeL-border-subtle)" }}>
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.round(masteryProgressVisual * 100)}%`,
                    background: "var(--easeL-accent-mint)",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {finishedPayload.unlock ? (
          <div className="px-5 pb-2 shrink-0">
            <div
              className="rounded-xl border-2 px-3 py-2 text-left easeL-accent-bg"
              style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 30%, transparent)" }}
            >
              <p className="easeL-accent-text-strong text-[10px] font-bold tracking-wider">
                {language === "ur" ? "نیا مرحلہ" : "New stage"}
              </p>
              <p className="text-sm font-bold" style={{ color: "var(--easeL-text)" }}>
                {finishedPayload.unlock.title}
              </p>
              <button
                type="button"
                onClick={onNavigateUnlock}
                className="easeL-accent-text-strong mt-1.5 inline-flex items-center gap-1 text-xs font-bold underline-offset-2 hover:opacity-90"
              >
                {language === "ur" ? "اس مرحلہ پر جائیں" : "Start this level"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 px-5 pb-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onSaveToGallery}
              disabled={saved}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-bold transition-all ${
                saved
                  ? "cursor-default text-white"
                  : "easeL-btn-solid"
              }`}
              style={saved ? { background: "var(--easeL-accent-mint)" } : undefined}
            >
              <Save className="w-5 h-5" />
              {saved
                ? language === "ur"
                  ? "گیلری میں محفوظ"
                  : "Saved to gallery"
                : language === "ur"
                ? "گیلری میں محفوظ کریں"
                : "Save to gallery"}
            </button>
            <button
              type="button"
              onClick={onNextAttempt}
              className="easeL-btn-outline inline-flex min-h-12 items-center justify-center gap-2 px-4 font-bold"
            >
              <RotateCcw className="w-5 h-5" />
              {language === "ur" ? "دوبارہ کوشش" : "Try again"}
            </button>
          </div>

          {stage.stage < 6 ? (
            <button
              type="button"
              onClick={onNavigateNextStage}
              disabled={!finishedPayload?.unlockQualified}
              className={`easeL-btn-solid inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-bold ${
                finishedPayload?.unlockQualified
                  ? "text-white"
                  : "cursor-not-allowed"
              }`}
              style={
                finishedPayload?.unlockQualified
                  ? { background: "var(--easeL-ink)", borderColor: "color-mix(in srgb, var(--easeL-ink) 70%, black)" }
                  : { background: "var(--easeL-border-subtle)", color: "var(--easeL-text-muted)" }
              }
            >
              {language === "ur" ? "اگلی سطح" : "Next stage"}
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onNavigateHome}
              className="easeL-btn-outline inline-flex min-h-11 items-center justify-center gap-2 px-4 font-semibold"
            >
              <Home className="w-4 h-4" />
              {language === "ur" ? "ہوم" : "App home"}
            </button>
            <button
              type="button"
              onClick={onBackToLessons}
              className="easeL-btn-outline inline-flex min-h-11 items-center justify-center gap-2 px-4 font-semibold"
              style={{ color: "var(--easeL-text-muted)" }}
            >
              <BookOpen className="w-4 h-4" />
              {language === "ur" ? "سبق منتخب کریں" : "Back to lessons"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
