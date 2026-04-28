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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  LESSON_STAGES,
  firstStageForMode,
  lastStageForMode,
  getStage,
  variantsForStage,
} from "../utils/lessonContent";

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

const VARIANT_LABELS = {
  en: {
    circle: "Circle",
    square: "Square",
    triangle: "Triangle",
    sun: "Sun",
    kite: "Kite",
    house: "House",
  },
  ur: {
    circle: "دائرہ",
    square: "مربع",
    triangle: "مثلث",
    sun: "سورج",
    kite: "پتنگ",
    house: "گھر",
  },
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
    async function load() {
      setLoadError(null);
      if (!user?.uid) {
        setPathId(2);
        setCurrentLevel(0);
        setLoading(false);
        return;
      }
      try {
        if (db) {
          const userDoc = await getDoc(doc(db, "profiles", user.uid));
          const data = userDoc.data() || {};
          setPathId(data.pathId ?? data.lipMode ?? 2);
          setCurrentLevel(data.currentLevel ?? data.currentStage ?? 0);
        } else {
          setPathId(profile?.pathId ?? profile?.lipMode ?? 2);
          setCurrentLevel(profile?.currentLevel ?? profile?.currentStage ?? 0);
        }
      } catch (e) {
        console.warn("LessonSelect load profile", e);
        setLoadError("Could not load lessons. Showing default.");
        setPathId(profile?.pathId ?? profile?.lipMode ?? 2);
        setCurrentLevel(profile?.currentLevel ?? profile?.currentStage ?? 0);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pt-24 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-medium">Loading path lessons...</p>
      </div>
    );
  }

  const displayMode = pathId ?? 2;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pt-24 pb-16 px-4">
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
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/95 shadow border border-slate-200/80 text-slate-700 hover:bg-indigo-50 transition-all"
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
                <span className="font-semibold text-indigo-600">
                  Level {displayStage} · {currentStageDef?.title ?? ""}
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
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${displayMode === 1 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        Path 1
                      </button>
                      <button
                        onClick={() => setPathId(2)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${displayMode === 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
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
                          className={`flex-1 min-w-[44px] py-2 rounded-lg text-sm font-medium ${displayStage === s.stage ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          {s.stage}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                    <button
                      onClick={() => { navigate(`/lesson-path1?stage=${displayStage}&lockStage=1`); setDevOpen(false); }}
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                    >
                      Open Path 1 Lesson (level {displayStage})
                    </button>
                    <button
                      onClick={() => { navigate(`/lesson-path2?stage=${displayStage}&lockStage=1`); setDevOpen(false); }}
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
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
                  language={language}
                  onStart={() => navigate(`${lessonPath}?stage=${s.stage}`)}
                />,
              ];
            }

            return variants.map((v) => {
              const VariantIcon = VARIANT_ICONS[v.variant] ?? StageIcon;
              const variantLabel =
                VARIANT_LABELS[language]?.[v.variant] ?? v.label;
              return (
                <StageCard
                  key={`stage-${s.stage}-${v.variant}`}
                  stage={s}
                  StageIcon={VariantIcon}
                  locked={false}
                  title={variantLabel}
                  description={`${title} · ${s.description}`}
                  subtitle={
                    language === "ur" ? `مرحلہ ${s.stage}` : `Level ${s.stage}`
                  }
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
  language,
  onStart,
}) {
  return (
    <div
      className={`rounded-3xl overflow-hidden shadow-lg border-2 transition-all flex flex-col ${
        locked
          ? "bg-white/80 border-slate-200 opacity-90"
          : "bg-white border-slate-200/90 hover:shadow-2xl hover:border-indigo-300 hover:-translate-y-0.5"
      }`}
    >
      <div className="aspect-[5/3] bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex items-center justify-center border-b border-slate-200">
        {createElement(StageIcon, { className: "w-14 h-14 text-indigo-500", strokeWidth: 1.75 })}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-800">
            Level {stage.stage}
          </span>
          {subtitle && !locked && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
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
        {locked ? (
          <div className="mt-3 flex items-center justify-center min-h-11 rounded-xl bg-slate-100 text-slate-500 font-medium cursor-not-allowed">
            {language === "ur" ? "بند" : "Locked"}
          </div>
        ) : (
          <button
            onClick={onStart}
            className="mt-3 w-full min-h-11 rounded-xl font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow hover:opacity-95 hover:shadow-lg transition-all"
          >
            {language === "ur" ? "شروع کریں" : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}
