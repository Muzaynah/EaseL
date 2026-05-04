import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCheck, Sparkles, Code2, ChevronDown, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  LESSON_STAGES,
  firstStageForMode,
  lastStageForMode,
  pathLessonDisplayLevel,
  variantsForStage,
  lessonCountInStage,
  lessonIndexWithinStage,
  lessonVariantDisplayName,
} from "../utils/lessonContent";
import { getTrialLog } from "../utils/persistence";
import { didTrialPass, evaluateMastery, filterTrials } from "../utils/stageAdaptation";

export default function LessonSelect() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [pathId, setPathId] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [devOpen, setDevOpen] = useState(false);
  const devDropdownRef = useRef(null);
  const language = profile?.caregiverReported?.language ?? "en";

  useEffect(() => {
    const resolveUnlockedStage = (src) => {
      const a = Number(src?.currentStage);
      const b = Number(src?.currentLevel);
      const stage = Number.isFinite(a) ? a : 0;
      const level = Number.isFinite(b) ? b : 0;
      return Math.max(stage, level);
    };
    async function load() {
      setLoadError(null);
      if (!user?.uid) {
        setLoadError("Authentication required to load lessons.");
        setPathId(null); setCurrentLevel(0); setLoading(false);
        return;
      }
      try {
        if (!profile) {
          setLoadError("Profile not available. Please retry from Home.");
          setPathId(null); setCurrentLevel(0);
        } else {
          setPathId(profile.pathId ?? profile.lipMode ?? null);
          setCurrentLevel(resolveUnlockedStage(profile));
        }
      } catch (e) {
        console.warn("LessonSelect load profile", e);
        setLoadError("Could not load lessons from cloud.");
        setPathId(null); setCurrentLevel(0);
      }
      setLoading(false);
    }
    load();
  }, [user?.uid, profile?.pathId, profile?.lipMode, profile?.currentLevel, profile?.currentStage]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (devDropdownRef.current && !devDropdownRef.current.contains(e.target)) setDevOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="easeL-page-bg flex min-h-screen flex-col items-center justify-center gap-4 easeL-page-top">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--easeL-border-subtle)] border-t-[var(--easeL-primary)]" />
        <p className="font-medium" style={{ color: "var(--easeL-text-muted)" }}>Loading path lessons...</p>
      </div>
    );
  }

  if (loadError && pathId == null) {
    return (
      <div className="easeL-page-bg flex min-h-screen flex-col items-center justify-center gap-4 px-6 easeL-page-top">
        <div className="easeL-card max-w-md p-6 text-center">
          <h2 className="easeL-heading-2">Could not load lessons</h2>
          <p className="easeL-text-muted mt-2">{loadError}</p>
          <button type="button" onClick={() => navigate("/home")} className="easeL-btn-solid mt-4 w-full">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const displayMode = pathId;
  const stages = LESSON_STAGES.filter((s) =>
    displayMode === 1 ? s.mode === 1 : s.mode === 2
  );
  const stageFloor = firstStageForMode(displayMode);
  const stageCeiling = lastStageForMode(displayMode);
  const displayStage = Math.max(stageFloor, Math.min(stageCeiling, currentLevel ?? stageFloor));
  const lessonPath = displayMode === 1 ? "/lesson-path1" : "/lesson-path2";
  const trialLog = typeof window !== "undefined" ? getTrialLog() : [];

  // Per-stage: mastery progress (0–1) and status
  const stageProgress = new Map(
    stages.map((s) => {
      const stageTrials = filterTrials(trialLog, { userId: user?.uid ?? "local", mode: s.mode, stage: s.stage });
      const mastery = evaluateMastery(s, stageTrials);
      // Mastery progress: ratio of passing trials in the recent window
      const targetN = Math.max(1, s.trialsForMastery ?? 5);
      const window = stageTrials.slice(-targetN);
      const passCount = window.filter((t) => didTrialPass(t, s)).length;
      const mastered = mastery.status === "advance";
      // Cleared = they ever scored ≥ STAGE_UNLOCK_ADHERENCE on this stage (check all trials)
      const cleared = stageTrials.some((t) => typeof t.adherence === "number" && t.adherence >= 80);
      // Continuous mastery fraction (0–1), based on pass rate in recent window
      const masteryFrac = mastered ? 1 : Math.max(0, Math.min(0.99, passCount / targetN));
      return [s.stage, { mastered, cleared, masteryFrac, passCount, targetN }];
    }),
  );

  return (
    <div className="easeL-page-bg min-h-screen px-4 pb-16 easeL-page-top">
      {loadError && (
        <div className="max-w-5xl mx-auto mb-4 px-4 py-2 rounded-xl text-sm text-center border-2"
          style={{ background: "var(--easeL-bg-card-coral)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text)" }}>
          {loadError}
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="easeL-heading-1 text-2xl md:text-3xl">
              {displayMode === 1 ? "Path 1 · Intent Assist" : "Path 2 · Guided Control"}
            </h1>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <LegendDot color="var(--easeL-border-subtle)" label={language === "ur" ? "بند" : "Locked"} />
              <LegendDot color="var(--easeL-primary)" label={language === "ur" ? "کھلا" : "Unlocked"} />
              <LegendDot color="var(--easeL-accent-mint)" label={language === "ur" ? "مہارت مکمل" : "Mastered"} />
            </div>
          </div>

          {/* Dev menu */}
          <div className="relative" ref={devDropdownRef}>
            <button
              type="button"
              onClick={() => setDevOpen((o) => !o)}
              className="easeL-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold shadow"
              style={{ background: "var(--easeL-bg-card-coral)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text)" }}
            >
              <Code2 className="w-4 h-4" />
              Dev
              <ChevronDown className={`w-4 h-4 easeL-transition-standard ${devOpen ? "rotate-180" : ""}`} />
            </button>
            {devOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-xl border-2 overflow-hidden z-50"
                style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}>
                <div className="p-3 border-b" style={{ background: "var(--easeL-bg-card-coral)", borderColor: "var(--easeL-border-strong)" }}>
                  <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--easeL-text)" }}>Development only</p>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Path</p>
                    <div className="flex gap-2">
                      {[1, 2].map((p) => (
                        <button key={p} onClick={() => setPathId(p)}
                          className={`flex-1 rounded-lg py-2 text-sm font-medium ${displayMode === p ? "bg-[var(--easeL-primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          Path {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Jump to level</p>
                    <div className="flex gap-2 flex-wrap">
                      {stages.map((s) => (
                        <button key={s.stage} onClick={() => setCurrentLevel(s.stage)}
                          className={`flex-1 min-w-[44px] rounded-lg py-2 text-sm font-medium ${displayStage === s.stage ? "bg-[var(--easeL-primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                          title={`Stage index ${s.stage}`}>
                          {pathLessonDisplayLevel(displayMode, s.stage)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                    <button onClick={() => { navigate(`/lesson-path2?stage=${displayStage}&lockStage=1`); setDevOpen(false); }}
                      className="easeL-accent-bg easeL-accent-text-strong w-full rounded-lg py-2.5 text-sm font-medium hover:opacity-90">
                      Open lesson (level {pathLessonDisplayLevel(displayMode, displayStage)})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {stages.map((s) => {
            const locked = displayStage < s.stage;
            const stageTitle = language === "ur" ? s.titleUr ?? s.title : s.title;
            const variants = variantsForStage(s);
            const hasMultipleVariants = variants.length > 1;
            const pathLevelNum = pathLessonDisplayLevel(displayMode, s.stage);
            const levelLabel = language === "ur" ? `مرحلہ ${pathLevelNum}` : `Level ${pathLevelNum}`;
            const totalInStage = lessonCountInStage(s);
            const prog = stageProgress.get(s.stage);

            const cards =
              locked || !hasMultipleVariants
                ? [
                    <StageCard
                      key={`stage-${s.stage}`}
                      stage={s}
                      locked={locked}
                      title={stageTitle}
                      description={s.description}
                      subtitle={hasMultipleVariants
                        ? language === "ur" ? `${variants.length} شکلیں` : `${variants.length} lessons`
                        : null}
                      prog={prog}
                      language={language}
                      onStart={() => navigate(`${lessonPath}?stage=${s.stage}`)}
                    />,
                  ]
                : variants.map((v) => {
                    const variantLabel = lessonVariantDisplayName(language, v.variant) || v.label;
                    const lessonNum = lessonIndexWithinStage(s, v.variant);
                    return (
                      <StageCard
                        key={`stage-${s.stage}-${v.variant}`}
                        stage={s}
                        locked={false}
                        title={variantLabel}
                        description={s.description}
                        lessonNum={lessonNum}
                        lessonTotal={totalInStage}
                        prog={prog}
                        language={language}
                        onStart={() => navigate(`${lessonPath}?stage=${s.stage}&variant=${v.variant}`)}
                      />
                    );
                  });

            return (
              <section key={`level-group-${s.stage}`} className="overflow-hidden rounded-2xl border-2"
                style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}>
                {/* Level header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
                  style={{ background: "color-mix(in srgb, var(--easeL-bg-page) 70%, white)", borderColor: "var(--easeL-border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border px-2.5 py-1 text-sm font-semibold"
                      style={{ background: "var(--easeL-primary)", color: "var(--easeL-text-on-dark)", borderColor: "color-mix(in srgb, var(--easeL-primary) 75%, black)" }}>
                      {levelLabel}
                    </span>
                    <p className="text-base font-semibold" style={{ color: "var(--easeL-text)" }}>{stageTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* State badge */}
                    {locked ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "var(--easeL-bg-page)", color: "var(--easeL-text-muted)" }}>
                        <Lock className="w-3 h-3" />
                        {language === "ur" ? "بند" : "Locked"}
                      </span>
                    ) : prog?.mastered ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: "color-mix(in srgb, var(--easeL-accent-mint) 18%, white)", color: "color-mix(in srgb, var(--easeL-accent-mint) 80%, black)", border: "1.5px solid color-mix(in srgb, var(--easeL-accent-mint) 45%, white)" }}>
                        {language === "ur" ? "مہارت مکمل" : "Mastered"}
                      </span>
                    ) : prog?.cleared ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: "color-mix(in srgb, var(--easeL-primary) 12%, white)", color: "var(--easeL-primary)", border: "1.5px solid color-mix(in srgb, var(--easeL-primary) 30%, white)" }}>
                        {language === "ur" ? "کھلا" : "Unlocked"}
                      </span>
                    ) : (
                      <span className="text-xs font-medium" style={{ color: "var(--easeL-text-muted)" }}>
                        {language === "ur" ? "جاری" : "In progress"}
                      </span>
                    )}
                    {/* Mastery bar in header */}
                    {!locked && (
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--easeL-border-subtle)" }}>
                          <div className="h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${Math.round((prog?.masteryFrac ?? 0) * 100)}%`,
                              background: prog?.mastered ? "var(--easeL-accent-mint)" : "var(--easeL-primary)",
                            }} />
                        </div>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--easeL-text-muted)" }}>
                          {Math.round((prog?.masteryFrac ?? 0) * 100)}%
                        </span>
                      </div>
                    )}
                    <span className="text-xs font-medium" style={{ color: "var(--easeL-text-muted)" }}>
                      {locked
                        ? language === "ur" ? "یہ مرحلہ ابھی بند ہے" : "Complete previous level"
                        : language === "ur" ? `${totalInStage} سبق` : `${totalInStage} lesson${totalInStage > 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-5">
                  {cards}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--easeL-text)" }}>
      <span className="w-4 h-4 rounded-full shrink-0 border border-white/60 shadow-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function StageCard({ stage, locked, title, description, subtitle, lessonNum, lessonTotal, language, prog, onStart }) {
  const masteryFrac = prog?.masteryFrac ?? 0;
  const mastered = prog?.mastered ?? false;
  const cleared = prog?.cleared ?? false;

  const accentColor = locked
    ? "var(--easeL-border-subtle)"
    : mastered
    ? "var(--easeL-accent-mint)"
    : "var(--easeL-primary)";

  return (
    <div className={`${locked ? "" : "easeL-hover-parent easeL-hoverable-card"} flex flex-col overflow-hidden rounded-2xl border`}
      style={{
        background: "var(--easeL-bg-section)",
        borderColor: locked ? "var(--easeL-border-subtle)" : "var(--easeL-border-strong)",
        opacity: locked ? 0.78 : 1,
      }}>
      {/* Top accent bar */}
      <div className="h-1.5 w-full" style={{ background: accentColor }} />

      <div className="p-4 flex-1 flex flex-col">
        {/* Sub-lesson badge / locked tag */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {lessonTotal != null && lessonNum != null && lessonTotal > 1 && !locked && (
            <span className="rounded-lg px-2.5 py-1 text-xs font-semibold border"
              style={{ background: "var(--easeL-bg-section)", color: "var(--easeL-text)", borderColor: "var(--easeL-border-subtle)" }}>
              {language === "ur" ? `سبق ${lessonNum} (${lessonTotal} میں سے)` : `Lesson ${lessonNum} of ${lessonTotal}`}
            </span>
          )}
          {subtitle && !locked && !(lessonTotal > 1 && lessonNum != null) && (
            <span className="rounded-lg px-2.5 py-1 text-xs font-semibold border"
              style={{ background: "var(--easeL-bg-section)", color: "var(--easeL-text-muted)", borderColor: "var(--easeL-border-subtle)" }}>
              {subtitle}
            </span>
          )}
          {locked && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--easeL-text-muted)" }}>
              <Lock className="w-3.5 h-3.5" />{language === "ur" ? "بند" : "Locked"}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold leading-tight" style={{ color: "var(--easeL-text)" }}>{title}</h3>
        <p className="text-sm mt-1 line-clamp-2 flex-1 font-medium" style={{ color: "var(--easeL-text-muted)" }}>{description}</p>

        {/* Mastery progress — always shown when unlocked */}
        {!locked && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--easeL-text-muted)" }}>
                {mastered
                  ? language === "ur" ? "مہارت مکمل" : "Mastered"
                  : language === "ur" ? "مہارت" : "Mastery"}
              </span>
              {mastered ? (
                <span className="text-xs font-bold" style={{ color: "var(--easeL-accent-mint)" }}>
                  {language === "ur" ? "مکمل" : "Complete"}
                </span>
              ) : cleared ? (
                <span className="text-[10px] font-bold" style={{ color: "var(--easeL-primary)" }}>
                  {language === "ur" ? "کھلا" : "Unlocked"}
                </span>
              ) : null}
            </div>
            {/* Progress bar — no numbers, purely continuous */}
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--easeL-border-subtle)" }}>
              <div className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.round(masteryFrac * 100)}%`,
                  background: mastered
                    ? "var(--easeL-accent-mint)"
                    : "var(--easeL-primary)",
                }} />
            </div>
            {/* Cleared tooltip — short explanation */}
            {cleared && !mastered && (
              <p className="mt-1.5 text-[10px] font-medium" style={{ color: "var(--easeL-text-muted)" }}>
                {language === "ur"
                  ? "اگلا مرحلہ کھل گیا۔ مشق جاری رکھیں مہارت کے لیے۔"
                  : "Unlocked! Keep practising to fully master this one."}
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        {locked ? (
          <div className="mt-3 flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl font-medium text-sm"
            style={{ background: "var(--easeL-bg-page)", color: "var(--easeL-text-muted)" }}>
            {language === "ur" ? "بند" : "Locked"}
          </div>
        ) : (
          <button onClick={onStart} className="easeL-btn-solid mt-3 w-full flex items-center justify-center gap-2 transition-all">
            {mastered
              ? language === "ur" ? "دوبارہ کھیلیں" : "Play again"
              : language === "ur" ? "شروع کریں" : "Start"}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
