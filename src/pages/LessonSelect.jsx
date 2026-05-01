import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  ChevronDown,
  Code2,
  Eye,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  LESSON_STAGES,
  firstStageForMode,
  lastStageForMode,
  getStage,
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
        setPathId(null);
        setCurrentLevel(0);
        setLoading(false);
        return;
      }
      try {
        if (!profile) {
          setLoadError("Profile not available. Please retry from dashboard.");
          setPathId(null);
          setCurrentLevel(0);
        } else {
          setPathId(profile.pathId ?? profile.lipMode ?? null);
          setCurrentLevel(resolveUnlockedStage(profile));
        }
      } catch (e) {
        console.warn("LessonSelect load profile", e);
        setLoadError("Could not load lessons from cloud.");
        setPathId(null);
        setCurrentLevel(0);
      }
      setLoading(false);
    }
    load();
  }, [user?.uid, profile?.pathId, profile?.lipMode, profile?.currentLevel, profile?.currentStage]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (devDropdownRef.current && !devDropdownRef.current.contains(e.target)) {
        setDevOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="easeL-page-bg flex min-h-screen flex-col items-center justify-center gap-4 pt-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--easeL-border-subtle)] border-t-[var(--easeL-primary)]" />
        <p className="font-medium" style={{ color: "var(--easeL-text-muted)" }}>Loading path lessons...</p>
      </div>
    );
  }

  if (loadError && pathId == null) {
    return (
      <div className="easeL-page-bg flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-24">
        <div className="easeL-card max-w-md p-6 text-center">
          <h2 className="easeL-heading-2">Could not load lessons</h2>
          <p className="easeL-text-muted mt-2">{loadError}</p>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="easeL-btn-solid mt-4 w-full"
          >
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
  // A Path 2 user's current level index should never be below 3 (first Path 2
  // lesson). If it is — e.g. a legacy profile — we repair display so lessons
  // are not all "Locked". Auth also normalises on load.
  const stageFloor = firstStageForMode(displayMode);
  const stageCeiling = lastStageForMode(displayMode);
  const displayStage = Math.max(
    stageFloor,
    Math.min(stageCeiling, currentLevel ?? stageFloor),
  );
  const currentStageDef = getStage(displayStage);
  const lessonPath = displayMode === 1 ? "/lesson-path1" : "/lesson-path2";
  const trialLog = typeof window !== "undefined" ? getTrialLog() : [];
  const stageProgress = new Map(
    stages.map((s) => {
      const stageTrials = filterTrials(trialLog, { userId: user?.uid ?? "local", mode: s.mode, stage: s.stage });
      const mastery = evaluateMastery(s, stageTrials);
      const targetAttempts = Math.max(1, s.trialsForMastery ?? 5);
      const window = stageTrials.slice(-targetAttempts);
      const passCount = window.filter((t) => didTrialPass(t, s)).length;
      const mastered = mastery.status === "advance";
      const masteryText = mastered
        ? language === "ur"
          ? "مہارت مکمل"
          : "Mastered"
        : language === "ur"
        ? `مہارت: ${passCount}/${targetAttempts}`
        : `Mastery: ${passCount}/${targetAttempts}`;
      const progress = mastered
        ? 1
        : Math.max(0, Math.min(1, passCount / targetAttempts));
      return [s.stage, { masteryText, mastered, progress }];
    }),
  );

  return (
    <div className="easeL-page-bg min-h-screen px-4 pb-16 pt-24">
      {loadError && (
        <div
          className="max-w-5xl mx-auto mb-4 px-4 py-2 rounded-xl text-sm text-center border-2"
          style={{
            background: "var(--easeL-bg-card-coral)",
            borderColor: "var(--easeL-border-strong)",
            color: "var(--easeL-text)",
          }}
        >
          {loadError}
        </div>
      )}
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <h1 className="easeL-heading-1 text-2xl md:text-3xl">
              {displayMode === 1 ? "Path 1 · Intent Assist" : "Path 2 · Guided Control"}
            </h1>
          </div>

          <div className="relative" ref={devDropdownRef}>
            <button
              type="button"
              onClick={() => setDevOpen((o) => !o)}
              className="easeL-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold shadow"
              style={{
                background: "var(--easeL-bg-card-coral)",
                borderColor: "var(--easeL-border-strong)",
                color: "var(--easeL-text)",
              }}
            >
              <Code2 className="w-4 h-4" />
              Dev
              <ChevronDown className={`w-4 h-4 easeL-transition-standard ${devOpen ? "rotate-180" : ""}`} />
            </button>
            {devOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-xl border-2 overflow-hidden z-50"
                style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}
              >
                <div
                  className="p-3 border-b"
                  style={{ background: "var(--easeL-bg-card-coral)", borderColor: "var(--easeL-border-strong)" }}
                >
                  <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--easeL-text)" }}>Development only</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--easeL-text-muted)" }}>Override path/level and jump to any lesson.</p>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Show lessons for path</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPathId(1)}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium ${displayMode === 1 ? "bg-[var(--easeL-primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        Path 1
                      </button>
                      <button
                        onClick={() => setPathId(2)}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium ${displayMode === 2 ? "bg-[var(--easeL-primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        Path 2
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Override current level</p>
                    <div className="flex gap-2 flex-wrap">
                      {stages.map((s) => (
                        <button
                          key={s.stage}
                          onClick={() => setCurrentLevel(s.stage)}
                          className={`flex-1 min-w-[44px] rounded-lg py-2 text-sm font-medium ${displayStage === s.stage ? "bg-[var(--easeL-primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          {s.stage}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                    <button
                      onClick={() => { navigate(`/lesson-path1?stage=${displayStage}&lockStage=1`); setDevOpen(false); }}
                      className="easeL-accent-bg easeL-accent-text-strong w-full rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
                    >
                      Open Path 1 Lesson (level {displayStage})
                    </button>
                    <button
                      onClick={() => { navigate(`/lesson-path2?stage=${displayStage}&lockStage=1`); setDevOpen(false); }}
                      className="w-full rounded-lg py-2.5 text-sm font-semibold hover:opacity-90"
                      style={{
                        background: "color-mix(in srgb, var(--easeL-accent-rose) 22%, white)",
                        color: "var(--easeL-text)",
                      }}
                    >
                      Open Path 2 Lesson (level {displayStage})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {stages.map((s) => {
            const locked = displayStage < s.stage;
            const stageTitle = language === "ur" ? s.titleUr ?? s.title : s.title;
            const variants = variantsForStage(s);
            const hasMultipleVariants = variants.length > 1;
            const levelLabel = language === "ur" ? `مرحلہ ${s.stage}` : `Level ${s.stage}`;
            const totalInStage = lessonCountInStage(s);
            const cards =
              locked || !hasMultipleVariants
                ? [
                    <StageCard
                      key={`stage-${s.stage}`}
                      stage={s}
                      locked={locked}
                      title={stageTitle}
                      description={s.description}
                      subtitle={
                        hasMultipleVariants
                          ? language === "ur"
                            ? `${variants.length} شکلیں`
                            : `${variants.length} lessons`
                          : null
                      }
                      mastery={stageProgress.get(s.stage)}
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
                        mastery={stageProgress.get(s.stage)}
                        language={language}
                        onStart={() => navigate(`${lessonPath}?stage=${s.stage}&variant=${v.variant}`)}
                      />
                    );
                  });

            return (
              <section
                key={`level-group-${s.stage}`}
                className="overflow-hidden rounded-2xl border-2"
                style={{
                  background: "var(--easeL-bg-section)",
                  borderColor: "var(--easeL-border-strong)",
                }}
              >
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
                  style={{
                    background: "color-mix(in srgb, var(--easeL-bg-page) 70%, white)",
                    borderColor: "var(--easeL-border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-lg border px-2.5 py-1 text-sm font-semibold"
                      style={{
                        background: "var(--easeL-primary)",
                        color: "var(--easeL-text-on-dark)",
                        borderColor: "color-mix(in srgb, var(--easeL-primary) 75%, black)",
                      }}
                    >
                      {levelLabel}
                    </span>
                    <p className="text-base font-semibold" style={{ color: "var(--easeL-text)" }}>
                      {stageTitle}
                    </p>
                  </div>
                  <p className="text-xs font-medium" style={{ color: "var(--easeL-text-muted)" }}>
                    {locked
                      ? language === "ur"
                        ? "یہ مرحلہ ابھی بند ہے"
                        : "This level is currently locked"
                      : language === "ur"
                      ? `${totalInStage} سبق`
                      : `${totalInStage} lesson${totalInStage > 1 ? "s" : ""}`}
                  </p>
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

function StageCard({
  stage,
  locked,
  title,
  description,
  subtitle,
  /** Sub-lesson index when this stage splits into variants (circle, square…). */
  lessonNum,
  lessonTotal,
  language,
  mastery,
  onStart,
}) {
  const masteryProgress = Math.max(0, Math.min(1, mastery?.progress ?? 0));
  const toneAccent =
    stage.stage % 3 === 2
      ? "var(--easeL-accent-coral)"
      : stage.stage % 3 === 0
      ? "var(--easeL-accent-mint)"
      : "var(--easeL-primary)";
  return (
    <div
      className={`${locked ? "" : "easeL-hover-parent easeL-hoverable-card"} flex flex-col overflow-hidden rounded-2xl border`}
      style={{
        background: "var(--easeL-bg-section)",
        borderColor: locked ? "var(--easeL-border-subtle)" : "var(--easeL-border-strong)",
        opacity: locked ? 0.86 : 1,
      }}
    >
      <div className="h-1.5 w-full" style={{ background: toneAccent }} />
      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {lessonTotal != null && lessonNum != null && lessonTotal > 1 && !locked && (
            <span
              className="rounded-lg px-2.5 py-1 text-xs font-semibold border"
              style={{
                background: "var(--easeL-bg-section)",
                color: "var(--easeL-text)",
                borderColor: "var(--easeL-border-subtle)",
              }}
            >
              {language === "ur"
                ? `سبق ${lessonNum} (${lessonTotal} میں سے)`
                : `Lesson ${lessonNum} of ${lessonTotal}`}
            </span>
          )}
          {subtitle && !locked && !(lessonTotal > 1 && lessonNum != null) && (
            <span
              className="rounded-lg px-2.5 py-1 text-xs font-semibold border"
              style={{
                background: "var(--easeL-bg-section)",
                color: "var(--easeL-text-muted)",
                borderColor: "var(--easeL-border-subtle)",
              }}
            >
              {subtitle}
            </span>
          )}
          {locked && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--easeL-text-muted)" }}>
              <Lock className="w-3.5 h-3.5" />{" "}
              {language === "ur" ? "بند" : "Locked"}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold leading-tight" style={{ color: "var(--easeL-text)" }}>
          {title}
        </h3>
        <p className="text-sm mt-1 line-clamp-2 flex-1 font-medium" style={{ color: "var(--easeL-text-muted)" }}>
          {description}
        </p>
        {!locked && mastery?.masteryText ? (
          <div
            className="mt-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
            style={
              mastery.mastered
                ? {
                    background: "color-mix(in srgb, var(--easeL-accent-mint) 20%, white)",
                    borderColor: "color-mix(in srgb, var(--easeL-accent-mint) 52%, white)",
                    color: "color-mix(in srgb, var(--easeL-accent-mint) 82%, black)",
                  }
                : {
                    background: "color-mix(in srgb, var(--easeL-accent-coral) 18%, white)",
                    borderColor: "color-mix(in srgb, var(--easeL-accent-coral) 52%, white)",
                    color: "color-mix(in srgb, var(--easeL-accent-coral) 86%, black)",
                  }
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span>{mastery.masteryText}</span>
              {mastery.mastered ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  style={{
                    background: "color-mix(in srgb, var(--easeL-accent-mint) 26%, white)",
                    color: "color-mix(in srgb, var(--easeL-accent-mint) 82%, black)",
                  }}
                >
                  {language === "ur" ? "تیار" : "Ready"}
                </span>
              ) : (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  style={{
                    background: "color-mix(in srgb, var(--easeL-accent-coral) 24%, white)",
                    color: "color-mix(in srgb, var(--easeL-accent-coral) 86%, black)",
                  }}
                >
                  {language === "ur" ? "جاری" : "In progress"}
                </span>
              )}
            </div>
            {!mastery.mastered ? (
              <div className="mt-2">
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: "color-mix(in srgb, var(--easeL-accent-coral) 24%, white)" }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.round(masteryProgress * 100)}%`,
                      background: "var(--easeL-accent-coral)",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {locked ? (
          <div
            className="mt-3 flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl font-medium"
            style={{ background: "var(--easeL-bg-page)", color: "var(--easeL-text-muted)" }}
          >
            {language === "ur" ? "بند" : "Locked"}
          </div>
        ) : (
          <button
            onClick={onStart}
            className="easeL-btn-solid mt-3 w-full transition-all"
          >
            {language === "ur" ? "شروع کریں" : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}
