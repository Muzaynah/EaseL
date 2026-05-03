import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Home, RotateCcw, Save, Star } from "lucide-react";
import ScoreSprinkles from "../../components/ScoreSprinkles";
import { UI_TOKENS } from "../../theme/uiTokens";

const SCORE_STROKE_W = 12;

/** Lucide `star` icon, scaled in gauge viewBox units (bigger than ring stroke). */
const PASS_STAR_SIZE = 32;
const PASS_STAR_FILL_PENDING = "#dbe3ea";
const PASS_STAR_FILL_ACTIVE = "#facc15";
/** Read on light purple track + grey/yellow fills */
const PASS_STAR_SHADOW =
  "drop-shadow(0 1.5px 2px rgb(0 0 0 / 0.28)) drop-shadow(0 0 1px rgb(0 0 0 / 0.12))";

/** Final score dot — darker mix so it matches the arc but stays visible on the stroke. */
const END_CAP_R = 6.25;

/** 0→1 easing for gauge fill (smooth deceleration at the end). */
function easeOutCubic(t) {
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) ** 3;
}

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
  scoreGaugeProgress,
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
  const passFrac = Math.max(
    0,
    Math.min(1, (finishedPayload.requiredAdherence ?? 0) / 100),
  );
  const gaugeR = Math.max(1, Number(gaugeRadius) || 64);
  const gaugeLen = 2 * Math.PI * gaugeR;
  const passAngle = passFrac * Math.PI * 2 - Math.PI / 2;
  const passMarkerX = 80 + Math.cos(passAngle) * gaugeR;
  const passMarkerY = 80 + Math.sin(passAngle) * gaugeR;
  const arcProgress = Math.max(0, Math.min(1, Number(scoreGaugeProgress) || 0));

  const FILL_MS = 1750;
  const [fillT, setFillT] = useState(0);
  const [passHitPulse, setPassHitPulse] = useState(false);
  const [showClearedUnderScore, setShowClearedUnderScore] = useState(false);
  const [showNotQuiteUnderScore, setShowNotQuiteUnderScore] = useState(false);
  const passCrossedRef = useRef(false);

  const rafRef = useRef(0);
  const passHitTimeoutRef = useRef(0);

  useEffect(() => {
    passCrossedRef.current = false;
    setFillT(0);
    setPassHitPulse(false);
    setShowClearedUnderScore(false);
    setShowNotQuiteUnderScore(false);
    cancelAnimationFrame(rafRef.current);
    window.clearTimeout(passHitTimeoutRef.current);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFillT(1);
      queueMicrotask(() => {
        if (finishedPayload.passed && passFrac > 0.001 && arcProgress + 1e-6 >= passFrac) {
          setPassHitPulse(true);
          setShowClearedUnderScore(true);
          passHitTimeoutRef.current = window.setTimeout(() => setPassHitPulse(false), 520);
        } else if (!finishedPayload.passed) {
          setShowNotQuiteUnderScore(true);
        }
      });
      return undefined;
    }

    const t0 = performance.now();
    const step = (now) => {
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / FILL_MS);
      setFillT(t);

      const arcFrac = easeOutCubic(t) * arcProgress;
      if (!passCrossedRef.current && passFrac > 0.001 && arcFrac >= passFrac - 0.003) {
        passCrossedRef.current = true;
        setPassHitPulse(true);
        setShowClearedUnderScore(true);
        passHitTimeoutRef.current = window.setTimeout(() => setPassHitPulse(false), 520);
      }

      if (t >= 1) {
        if (!finishedPayload.passed) {
          setShowNotQuiteUnderScore(true);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(passHitTimeoutRef.current);
    };
  }, [arcProgress, passFrac, finishedPayload.passed]);

  const displayArcFrac = easeOutCubic(fillT) * arcProgress;
  const displayPercent = Math.round(displayArcFrac * 100);
  const scoreColor = finishedPayload.passed ? UI_TOKENS.lesson.gaugePass : UI_TOKENS.lesson.warning;
  const endCapFill = finishedPayload.passed
    ? `color-mix(in srgb, ${UI_TOKENS.lesson.gaugePass} 66%, #100818)`
    : `color-mix(in srgb, ${UI_TOKENS.lesson.warning} 66%, #1c0a06)`;
  /** Slightly deeper salmon–red so the “left” ring feels unfinished vs the soft track token. */
  const gaugeTrackIncomplete = `color-mix(in srgb, ${UI_TOKENS.lesson.gaugeTrack} 58%, ${UI_TOKENS.lesson.warning})`;
  const knobAngle = displayArcFrac * Math.PI * 2 - Math.PI / 2;
  const knobX = 80 + Math.cos(knobAngle) * gaugeR;
  const knobY = 80 + Math.sin(knobAngle) * gaugeR;
  const showScoreKnob = displayArcFrac > 0.001;
  const passStarReached =
    passFrac <= 0.001 || displayArcFrac + 1e-5 >= passFrac;
  const passStarFill = passStarReached ? PASS_STAR_FILL_ACTIVE : PASS_STAR_FILL_PENDING;
  const hasGaugeStatusLabel = showClearedUnderScore || showNotQuiteUnderScore;

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
              <div className="mx-auto h-40 w-40">
                <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden>
                  <circle
                    cx="80"
                    cy="80"
                    r={gaugeR}
                    fill="none"
                    stroke={gaugeTrackIncomplete}
                    strokeWidth={SCORE_STROKE_W}
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={gaugeR}
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth={SCORE_STROKE_W}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    strokeDasharray={gaugeLen}
                    strokeDashoffset={gaugeLen * (1 - displayArcFrac)}
                  />
                  {showScoreKnob ? (
                    <circle cx={knobX} cy={knobY} r={END_CAP_R} fill={endCapFill} />
                  ) : null}
                  <g
                    transform={`translate(${passMarkerX} ${passMarkerY})`}
                    style={{ filter: PASS_STAR_SHADOW }}
                  >
                    <g className={passHitPulse ? "easeL-gauge-pass-star-pulse" : ""}>
                      <Star
                        aria-hidden
                        size={PASS_STAR_SIZE}
                        x={-PASS_STAR_SIZE / 2}
                        y={-PASS_STAR_SIZE / 2}
                        fill={passStarFill}
                        stroke="none"
                        color={passStarFill}
                      />
                    </g>
                  </g>
                  <g transform="translate(80 80)">
                    <text
                      x="0"
                      y={hasGaugeStatusLabel ? -9 : 0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[28px] font-black tabular-nums"
                      fill="var(--easeL-text)"
                    >
                      {displayPercent}%
                    </text>
                    {showClearedUnderScore ? (
                      <g transform="translate(0 13)">
                        <g className="easeL-cleared-under-score-pop">
                          <text
                            x="0"
                            y="0"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-[11px] font-bold uppercase tracking-wide sm:text-xs"
                            fill="var(--easeL-accent-mint)"
                          >
                            {language === "ur" ? "کلیئر" : "Cleared"}
                          </text>
                        </g>
                      </g>
                    ) : null}
                    {showNotQuiteUnderScore ? (
                      <g transform="translate(0 13)">
                        <g className="easeL-cleared-under-score-pop">
                          <text
                            x="0"
                            y="0"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-[11px] font-bold uppercase tracking-wide sm:text-xs"
                            fill="var(--easeL-accent-coral)"
                          >
                            {language === "ur" ? "ابھی نہیں" : "Not quite"}
                          </text>
                        </g>
                      </g>
                    ) : null}
                  </g>
                </svg>
              </div>
            </div>
          </div>
          <div
            className="mt-4 rounded-xl border-2 px-3 py-2.5 text-center text-xs font-semibold sm:text-sm"
            style={
              finishedPayload.unlockQualified
                ? {
                    background: "color-mix(in srgb, var(--easeL-accent-mint) 12%, white)",
                    borderColor: "color-mix(in srgb, var(--easeL-accent-mint) 40%, var(--easeL-border-strong))",
                    color: "var(--easeL-text)",
                  }
                : {
                    background: "color-mix(in srgb, var(--easeL-accent-coral) 10%, white)",
                    borderColor: "color-mix(in srgb, var(--easeL-accent-coral) 35%, var(--easeL-border-strong))",
                    color: "var(--easeL-text)",
                  }
            }
          >
            {finishedPayload.unlockQualified
              ? language === "ur"
                ? "اگلا مرحلہ کھل گیا"
                : "Next stage unlocked"
              : language === "ur"
              ? `اگلا مرحلہ: مزید ${stageUnlockAdherence}%`
              : `Next stage: need ${stageUnlockAdherence}% overall`}
          </div>
          {finishedPayload.masteryProgress ? (
            <div className="mt-3 rounded-xl border-2 px-3 py-2.5" style={{ borderColor: "var(--easeL-border-subtle)" }}>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold sm:text-xs" style={{ color: "var(--easeL-text-muted)" }}>
                <span>{language === "ur" ? "مہارت" : "Mastery"}</span>
                <span className="tabular-nums">
                  {finishedPayload.masteryProgress.after}/{finishedPayload.masteryProgress.target}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--easeL-border-subtle)" }}>
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
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
              {language === "ur" ? "ہوم" : "Home"}
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
