import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LESSON_STAGES } from "../utils/lessonContent";
import { getTrialLog } from "../utils/persistence";
import { evaluateMastery } from "../utils/stageAdaptation";
import { sayPhrase } from "../utils/screenerAudio";

function isPath1Complete(userId) {
  const log = typeof window !== "undefined" ? getTrialLog() : [];
  const path1Stages = LESSON_STAGES.filter((s) => s.mode === 1);
  for (const s of path1Stages) {
    const trials = log.filter(
      (t) => t.userId === userId && t.mode === 1 && t.stage === s.stage
    );
    const result = evaluateMastery(s, trials);
    if (!result.mastered) return false;
  }
  return true;
}

export default function LearningPaths() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const assignedPath = profile?.pathId ?? profile?.lipMode ?? null;
  const language = profile?.caregiverReported?.language ?? "en";

  const path1Done = isPath1Complete(user?.uid ?? "local");
  const path2Locked = assignedPath === 1 && !path1Done;

  const paths = [
    {
      id: 1,
      title: language === "ur" ? "پاتھ 1 · انٹینٹ اسسٹ" : "Path 1 · Intent Assist",
      description:
        language === "ur"
          ? "سر کی حرکت اور آنکھ کی سمت سے سیکھیں۔ آٹو کمپلیٹ اور گائیڈڈ ٹریسنگ کے ساتھ۔"
          : "Learn with head tilt and gaze direction. Autocomplete and guided tracing keep it accessible.",
      levels: 3,
      locked: false,
      isAssigned: assignedPath === 1,
      color: "var(--easeL-primary)",
    },
    {
      id: 2,
      title: language === "ur" ? "پاتھ 2 · گائیڈڈ کنٹرول" : "Path 2 · Guided Control",
      description:
        language === "ur"
          ? "لائنوں، منحنی شکلوں اور بند اشکال کو ٹریس کریں۔ پاتھ 1 مکمل کرنے کے بعد"
          : "Trace straight lines, curves, and closed shapes. Unlocks after completing Path 1.",
      levels: 4,
      locked: path2Locked,
      isAssigned: assignedPath === 2,
      color: "var(--easeL-accent-mint)",
    },
  ];

  return (
    <div className="easeL-page-bg min-h-screen px-4 pb-16 easeL-page-top">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="easeL-heading-1 text-2xl md:text-3xl">
            {language === "ur" ? "سیکھنے کے راستے" : "Learning Paths"}
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--easeL-text-muted)" }}>
            {language === "ur"
              ? "اپنا راستہ چنیں یا اپنی ترقی دیکھیں۔"
              : "Choose a path to explore its lessons or view your progress."}
          </p>
        </div>

        <div className="space-y-4">
          {paths.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border-2"
              style={{
                background: "var(--easeL-bg-section)",
                borderColor: p.locked ? "var(--easeL-border-subtle)" : "var(--easeL-border-strong)",
                opacity: p.locked ? 0.72 : 1,
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-1.5 w-full"
                style={{ background: p.locked ? "var(--easeL-border-subtle)" : p.color }}
              />

              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold" style={{ color: "var(--easeL-text)" }}>
                      {p.title}
                    </h2>
                    {p.isAssigned && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{
                          background: "color-mix(in srgb, var(--easeL-primary) 14%, white)",
                          color: "var(--easeL-primary)",
                          border: "1.5px solid color-mix(in srgb, var(--easeL-primary) 35%, white)",
                        }}
                      >
                        {language === "ur" ? "آپ کا راستہ" : "Your path"}
                      </span>
                    )}
                    {p.locked && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: "var(--easeL-bg-page)", color: "var(--easeL-text-muted)" }}
                      >
                        <Lock className="h-3 w-3" />
                        {language === "ur" ? "بند" : "Locked"}
                      </span>
                    )}
                    {p.id === 1 && path1Done && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{
                          background: "color-mix(in srgb, var(--easeL-accent-mint) 15%, white)",
                          color: "color-mix(in srgb, var(--easeL-accent-mint) 75%, black)",
                          border: "1.5px solid color-mix(in srgb, var(--easeL-accent-mint) 40%, white)",
                        }}
                      >
                        <CheckCheck className="h-3 w-3" />
                        {language === "ur" ? "مکمل" : "Complete"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "var(--easeL-text-muted)" }}>
                    {p.description}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold" style={{ color: "var(--easeL-text-muted)" }}>
                    {language === "ur" ? `${p.levels} درجے` : `${p.levels} level${p.levels > 1 ? "s" : ""}`}
                  </p>
                </div>

                <div className="shrink-0">
                  {p.locked ? (
                    <div
                      className="flex min-h-11 min-w-[140px] cursor-not-allowed items-center justify-center rounded-xl font-medium text-sm"
                      style={{ background: "var(--easeL-bg-page)", color: "var(--easeL-text-muted)" }}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {language === "ur" ? "پاتھ 1 مکمل کریں" : "Complete Path 1"}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        sayPhrase(p.id === 1 ? "nextLevel" : "nextLevel", language);
                        navigate("/lessons", { state: { forcePathId: p.id } });
                      }}
                      className="easeL-btn-solid flex min-w-[140px] items-center justify-center gap-2"
                    >
                      {language === "ur" ? "دیکھیں" : "View lessons"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="easeL-btn-outline min-h-11 px-6"
          >
            {language === "ur" ? "واپس جائیں" : "Go back"}
          </button>
        </div>
      </div>
    </div>
  );
}
