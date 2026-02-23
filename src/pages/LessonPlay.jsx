import { useParams, useNavigate } from "react-router-dom";
import { X, SkipForward, RotateCcw, ArrowRight } from "lucide-react";

const currentLesson = {
  id: 2,
  title: "Draw a Square",
  currentStep: 2,
  totalSteps: 4,
  instruction: "Draw the right side",
  targetPath: [],
};

export default function LessonPlay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const progress = Math.round((currentLesson.currentStep / currentLesson.totalSteps) * 100);

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 z-40">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 min-h-16 shrink-0">
        <button
          onClick={() => navigate("/lessons")}
          className="flex items-center justify-center w-12 h-12 rounded-2xl text-slate-600 hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Exit lesson"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-slate-800">
          {currentLesson.title} – Step {currentLesson.currentStep} of {currentLesson.totalSteps}
        </h2>
        <div className="w-32">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main area */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-1 relative flex items-center justify-center p-4">
          {/* Target path placeholder (dashed) */}
          <div className="absolute inset-4 border-2 border-dashed border-indigo-300 rounded-3xl bg-white/50 flex items-center justify-center">
            <span className="text-slate-500 text-sm">Drawing canvas area</span>
          </div>
          {/* Instruction box */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border border-white/50">
            <p className="text-xl font-semibold text-slate-800">
              {currentLesson.instruction}
            </p>
          </div>
        </div>
        {/* Optional feedback sidebar */}
        <aside className="w-full md:w-72 shrink-0 p-4 border-t md:border-t-0 md:border-l border-slate-200 bg-white/80">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="font-semibold text-emerald-800">Keep going!</p>
            <p className="text-sm text-emerald-700 mt-1">Accuracy: 85%</p>
          </div>
        </aside>
      </main>

      {/* Bottom controls */}
      <footer className="flex items-center justify-between px-4 py-4 bg-white/90 backdrop-blur-md border-t border-slate-200 min-h-20 shrink-0">
        <button
          onClick={() => navigate("/lessons")}
          className="flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
        >
          <SkipForward className="w-5 h-5" />
          Skip
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Try Again
        </button>
        <button
          onClick={() => {
            if (currentLesson.currentStep >= currentLesson.totalSteps) {
              navigate("/lessons");
            } else {
              // In real app would advance step
              navigate("/lessons");
            }
          }}
          className="flex items-center justify-center gap-2 min-h-12 px-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:opacity-95 transition-all"
        >
          Next Step
          <ArrowRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}
