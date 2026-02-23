import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Lock } from "lucide-react";

const lessons = [
  {
    id: 1,
    title: "Draw a Circle",
    difficulty: "easy",
    steps: 1,
    description: "Learn to draw smooth circles",
    progress: 100,
    completed: true,
  },
  {
    id: 2,
    title: "Draw a Square",
    difficulty: "easy",
    steps: 4,
    description: "Master straight lines and corners",
    progress: 50,
    completed: false,
  },
  {
    id: 3,
    title: "Draw a Triangle",
    difficulty: "medium",
    steps: 3,
    description: "Create perfect triangles",
    progress: 0,
    locked: true,
  },
  {
    id: 4,
    title: "Draw a Star",
    difficulty: "medium",
    steps: 5,
    description: "Connect lines to form a star",
    progress: 0,
    locked: true,
  },
  {
    id: 5,
    title: "Draw a House",
    difficulty: "hard",
    steps: 6,
    description: "Combine shapes into a house",
    progress: 0,
    locked: true,
  },
];

const difficultyColors = {
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
};

export default function LessonSelect() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? lessons
      : lessons.filter((l) => l.difficulty === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/home")}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md border border-white/50 text-slate-700 hover:bg-indigo-50 transition-all"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-slate-800">Guided Lessons</h1>
          </div>
          <div className="flex gap-2">
            {["all", "easy", "medium", "hard"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`min-h-12 px-4 rounded-2xl font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700"
                    : "bg-white/90 backdrop-blur-md border border-white/50 text-slate-600 hover:bg-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((lesson) => (
            <div
              key={lesson.id}
              className={`bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50 transition-all ${
                lesson.locked ? "opacity-75" : "hover:shadow-indigo-100/50"
              }`}
            >
              <div className="aspect-video bg-slate-100 flex items-center justify-center border-b border-slate-100">
                <BookOpen className="w-16 h-16 text-slate-400" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium ${difficultyColors[lesson.difficulty]}`}
                  >
                    {lesson.difficulty}
                  </span>
                  {lesson.locked && (
                    <span className="flex items-center gap-1 text-slate-500 text-xs">
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800">{lesson.title}</h3>
                <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                  {lesson.description}
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  {lesson.steps} step{lesson.steps !== 1 ? "s" : ""}
                </p>
                {lesson.progress > 0 && !lesson.completed && (
                  <div className="mt-3">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${lesson.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {lesson.locked ? (
                  <span className="mt-4 flex items-center justify-center min-h-12 w-full rounded-2xl font-semibold bg-slate-100 text-slate-500 cursor-not-allowed">
                    Locked
                  </span>
                ) : (
                  <Link
                    to={`/lesson/${lesson.id}`}
                    className="mt-4 flex items-center justify-center min-h-12 w-full rounded-2xl font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:opacity-95 transition-all"
                  >
                    {lesson.completed ? "Review" : lesson.progress > 0 ? "Continue" : "Start"}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
