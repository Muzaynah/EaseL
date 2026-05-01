import { useEffect, useRef, useState, createElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  ChevronDown,
  Code2,
  Eye,
  Target,
  Play,
  Minus,
  Sun,
  Circle,
  Sparkles,
  Square,
  Triangle,
  Home as HomeIcon,
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

const ICONS = {
  eye: Eye,
  target: Target,
  play: Play,
  minus: Minus,
  arc: Sun,
  circle: Circle,
  sparkles: Sparkles,
};

// Per-variant iconography for Stages 5 / 6 so every tile reads as a distinct
// shape at a glance.  Lucide doesn't ship a kite icon, so we fall back to the
// `Sparkles` glyph for it.
const VARIANT_ICONS = {
  circle: Circle,
  square: Square,
  triangle: Triangle,
  sun: Sun,
  kite: Sparkles,
  house: HomeIcon,
};

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
        <p className="text-slate-600 font-medium">Loading path lessons...</p>
      </div>
    );
  }

  if (loadError && pathId == null) {
    return (
      <div className="easeL-page-bg flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-24">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-xl">
          <h2 className="text-xl font-bold text-slate-800">Could not load lessons</h2>
          <p className="mt-2 text-slate-600">{loadError}</p>
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
        <div className="max-w-5xl mx-auto mb-4 px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-sm text-center">
          {loadError}
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/home")}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 text-slate-700 shadow transition-all hover:bg-[color-mix(in_srgb,var(--easeL-primary)_10%,white)]"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              {displayMode === 1 ? "Path 1 · Intent Assist" : "Path 2 · Guided Control"}
            </h1>
            <div className="px-4 py-2 rounded-xl bg-white/95 shadow border border-slate-200/80">
              <p className="text-sm text-slate-600">
                Current level:{" "}
                <span className="easeL-accent-text-strong font-semibold">
                  {language === "ur"
                    ? `مرحلہ ${displayStage} · ${currentStageDef?.titleUr ?? currentStageDef?.title ?? ""}`
                    : `Level ${displayStage} · ${currentStageDef?.title ?? ""}`}
                  {lessonCountInStage(currentStageDef) > 1
                    ? language === "ur"
                      ? ` · ${lessonCountInStage(currentStageDef)} مختلف سبق`
                      : ` · ${lessonCountInStage(currentStageDef)} numbered lessons`
                    : null}
                </span>
              </p>
            </div>
          </div>

          <div className="relative" ref={devDropdownRef}>
            <button
              type="button"
              onClick={() => setDevOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-medium shadow"
            >
              <Code2 className="w-4 h-4" />
              Dev
              <ChevronDown className={`w-4 h-4 transition-transform ${devOpen ? "rotate-180" : ""}`} />
            </button>
            {devOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white shadow-xl border-2 border-amber-200 overflow-hidden z-50">
                <div className="p-3 bg-amber-50 border-b border-amber-200">
                  <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Development only</p>
                  <p className="text-xs text-amber-800 mt-0.5">Override path/level and jump to any lesson.</p>
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
                        color: "#4a1f3a",
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {stages.flatMap((s) => {
            const StageIcon = ICONS[s.icon] ?? Eye;
            const locked = displayStage < s.stage;
            const title = language === "ur" ? s.titleUr ?? s.title : s.title;
            const variants = variantsForStage(s);
            const hasMultipleVariants = variants.length > 1;

            // Locked stages collapse to a single summary tile so the grid
            // doesn't balloon with unreachable variants.  Once unlocked, each
            // variant gets its own tile for direct access.
            if (locked || !hasMultipleVariants) {
              return [
                <StageCard
                  key={`stage-${s.stage}`}
                  stage={s}
                  StageIcon={StageIcon}
                  locked={locked}
                  title={title}
                  description={s.description}
                  subtitle={
                    hasMultipleVariants
                      ? language === "ur"
                        ? `${variants.length} شکلیں`
                        : `${variants.length} shapes`
                      : null
                  }
                  mastery={stageProgress.get(s.stage)}
                  language={language}
                  onStart={() => navigate(`${lessonPath}?stage=${s.stage}`)}
                />,
              ];
            }

            const totalInStage = lessonCountInStage(s);
            return variants.map((v) => {
              const VariantIcon = VARIANT_ICONS[v.variant] ?? StageIcon;
              const variantLabel =
                lessonVariantDisplayName(language, v.variant) || v.label;
              const lessonNum = lessonIndexWithinStage(s, v.variant);
              return (
                <StageCard
                  key={`stage-${s.stage}-${v.variant}`}
                  stage={s}
                  StageIcon={VariantIcon}
                  locked={false}
                  title={variantLabel}
                  description={s.description}
                  lessonNum={lessonNum}
                  lessonTotal={totalInStage}
                  mastery={stageProgress.get(s.stage)}
                  language={language}
                  onStart={() =>
                    navigate(
                      `${lessonPath}?stage=${s.stage}&variant=${v.variant}`,
                    )
                  }
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

function StageCard({
  stage,
  StageIcon,
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
  return (
    <div
      className={`rounded-3xl overflow-hidden shadow-lg border-2 transition-all flex flex-col ${
        locked
          ? "bg-white/80 border-slate-200 opacity-90"
          : "border-slate-200/90 bg-white hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--easeL-primary)_35%,transparent)] hover:shadow-2xl"
      }`}
    >
      <div
        className="flex aspect-[5/3] items-center justify-center border-b border-slate-200"
        style={{
          background: "linear-gradient(145deg, color-mix(in srgb, var(--easeL-primary) 10%, white), var(--easeL-bg-section))",
        }}
      >
        {createElement(StageIcon, { className: "easeL-accent-text-strong h-14 w-14", strokeWidth: 1.75 })}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="easeL-accent-bg easeL-accent-text-strong rounded-lg px-2.5 py-1 text-xs font-semibold">
            Level {stage.stage}
          </span>
          {lessonTotal != null && lessonNum != null && lessonTotal > 1 && !locked && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {language === "ur"
                ? `سبق ${lessonNum} (${lessonTotal} میں سے)`
                : `Lesson ${lessonNum} of ${lessonTotal}`}
            </span>
          )}
          {subtitle && !locked && !(lessonTotal > 1 && lessonNum != null) && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {subtitle}
            </span>
          )}
          {locked && (
            <span className="flex items-center gap-1 text-slate-500 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />{" "}
              {language === "ur" ? "بند" : "Locked"}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-800 leading-tight">
          {title}
        </h3>
        <p className="text-slate-600 text-sm mt-1 line-clamp-2 flex-1">
          {description}
        </p>
        {!locked && mastery?.masteryText ? (
          <div
            className={`mt-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
              mastery.mastered
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span>{mastery.masteryText}</span>
              {mastery.mastered ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {language === "ur" ? "تیار" : "Ready"}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  {language === "ur" ? "جاری" : "In progress"}
                </span>
              )}
            </div>
            {!mastery.mastered ? (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                    style={{ width: `${Math.round(masteryProgress * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {locked ? (
          <div className="mt-3 flex items-center justify-center min-h-11 rounded-xl bg-slate-100 text-slate-500 font-medium cursor-not-allowed">
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
