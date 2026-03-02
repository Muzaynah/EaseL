import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Target, Route, ChevronDown, Code2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const MODE_1_LESSONS = [
  { tier: 0, title: "Touch the Target", description: "Maximum assistance – one target at a time." },
  { tier: 1, title: "Multiple Targets", description: "Reduced assistance – two targets." },
  { tier: 2, title: "Advanced Targets", description: "Minimal assistance – four targets." },
];

const MODE_2_LESSONS = [
  { tier: 0, title: "Straight Path", description: "Wide corridor – trace the line." },
  { tier: 1, title: "Curved Path", description: "Medium corridor – gentle curve." },
  { tier: 2, title: "Complex Path", description: "Narrow corridor – complex curve." },
];

export default function LessonSelect() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [lipMode, setLipMode] = useState(null);
  const [currentTier, setCurrentTier] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [devOpen, setDevOpen] = useState(false);
  const devDropdownRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoadError(null);
      if (!user?.uid) {
        setLipMode(2);
        setCurrentTier(0);
        setLoading(false);
        return;
      }
      try {
        if (db) {
          const userDoc = await getDoc(doc(db, "profiles", user.uid));
          const data = userDoc.data() || {};
          setLipMode(data.lipMode ?? 2);
          setCurrentTier(data.currentStage ?? 0);
        } else {
          setLipMode(profile?.lipMode ?? 2);
          setCurrentTier(profile?.currentStage ?? 0);
        }
      } catch (e) {
        console.warn("LessonSelect load profile", e);
        setLoadError("Could not load lessons. Showing default.");
        setLipMode(profile?.lipMode ?? 2);
        setCurrentTier(profile?.currentStage ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [user?.uid, profile?.lipMode, profile?.currentStage]);

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
        <p className="text-slate-600 font-medium">Loading lessons...</p>
      </div>
    );
  }

  const displayMode = lipMode ?? 2;
  const displayTier = currentTier ?? 0;
  const lessons = displayMode === 1 ? MODE_1_LESSONS : MODE_2_LESSONS;
  const Icon = displayMode === 1 ? Target : Route;
  const lessonPath = displayMode === 1 ? "/lesson-mode1" : "/lesson-mode2";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pt-24 pb-16 px-4">
      {loadError && (
        <div className="max-w-5xl mx-auto mb-4 px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-sm text-center">
          {loadError}
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        {/* Header row: back, title, tier badge, dev dropdown */}
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
              {displayMode === 1 ? "Mode 1: Intent Capture" : "Mode 2: Guided Control"}
            </h1>
            <div className="px-4 py-2 rounded-xl bg-white/95 shadow border border-slate-200/80">
              <p className="text-sm text-slate-600">
                Your tier: <span className="font-semibold text-indigo-600">{displayTier + 1}</span>
              </p>
            </div>
          </div>

          {/* Dev dropdown – access everything during development */}
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
                  <p className="text-xs text-amber-800 mt-0.5">Override mode/tier and jump to any lesson.</p>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Show lessons for mode</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLipMode(1)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${displayMode === 1 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        Mode 1
                      </button>
                      <button
                        onClick={() => setLipMode(2)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${displayMode === 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        Mode 2
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Override tier (for testing)</p>
                    <div className="flex gap-2">
                      {[0, 1, 2].map((t) => (
                        <button
                          key={t}
                          onClick={() => setCurrentTier(t)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium ${displayTier === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          {t + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2">Open lesson directly</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { navigate("/lesson-mode1"); setDevOpen(false); }}
                        className="w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                      >
                        Open Mode 1 Lesson
                      </button>
                      <button
                        onClick={() => { navigate("/lesson-mode2"); setDevOpen(false); }}
                        className="w-full py-2.5 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
                      >
                        Open Mode 2 Lesson
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => {
            const locked = displayTier < lesson.tier;
            return (
              <div
                key={lesson.tier}
                className={`rounded-3xl overflow-hidden shadow-xl border-2 transition-all ${
                  locked
                    ? "bg-white/80 border-slate-200 opacity-90"
                    : "bg-white border-slate-200/90 hover:shadow-2xl hover:border-indigo-200"
                }`}
              >
                <div className="aspect-video bg-slate-100 flex items-center justify-center border-b border-slate-200">
                  <Icon className="w-16 h-16 text-slate-400" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-800">
                      Tier {lesson.tier + 1}
                    </span>
                    {locked && (
                      <span className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{lesson.title}</h3>
                  <p className="text-slate-600 text-sm mt-1 line-clamp-2">{lesson.description}</p>
                  {locked ? (
                    <div className="mt-4 flex items-center justify-center min-h-12 rounded-2xl bg-slate-100 text-slate-500 font-medium cursor-not-allowed">
                      Locked
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(lessonPath)}
                      className="mt-4 w-full min-h-12 rounded-2xl font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:opacity-95 hover:shadow-xl transition-all"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
