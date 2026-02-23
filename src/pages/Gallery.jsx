import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, Palette } from "lucide-react";

const mockDrawings = [
  { id: 1, title: "Sunset Landscape", date: "2 days ago", type: "free", thumbnail: "" },
  { id: 2, title: "Circle Practice", date: "3 days ago", type: "lesson", thumbnail: "" },
  { id: 3, title: "Mountain Scene", date: "1 week ago", type: "free", thumbnail: "" },
  { id: 4, title: "Square Lesson", date: "1 week ago", type: "lesson", thumbnail: "" },
  { id: 5, title: "Abstract Art", date: "2 weeks ago", type: "free", thumbnail: "" },
  { id: 6, title: "Line Practice", date: "2 weeks ago", type: "lesson", thumbnail: "" },
];

export default function Gallery() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("all"); // all | lessons | free
  const [sort, setSort] = useState("recent"); // recent | name | date

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("gesture-projects") || "[]");
    setProjects(saved.reverse());
  }, []);

  const savedAsDrawings = projects.map((img, i) => ({
    id: `saved-${i}`,
    title: `Project ${projects.length - i}`,
    date: "Recently",
    type: "free",
    thumbnail: img,
    isSaved: true,
    projectIndex: i,
  }));

  const allDrawings = [
    ...savedAsDrawings,
    ...mockDrawings.map((d) => ({ ...d, isSaved: false })),
  ];

  const filtered =
    filter === "all"
      ? allDrawings
      : allDrawings.filter((d) => d.type === (filter === "lessons" ? "lesson" : "free"));
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return (a.title || "").localeCompare(b.title || "");
    if (sort === "date") return 0;
    return 0;
  });

  function deleteProject(index) {
    const updated = [...projects];
    updated.splice(index, 1);
    setProjects(updated);
    localStorage.setItem("gesture-projects", JSON.stringify([...updated].reverse()));
  }

  function handleDelete(drawing) {
    if (drawing.isSaved && drawing.projectIndex != null) {
      deleteProject(drawing.projectIndex);
    }
  }

  const filters = [
    { key: "all", label: "All" },
    { key: "lessons", label: "Lessons" },
    { key: "free", label: "Free Draw" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-slate-800">My Gallery</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-2xl bg-white/90 backdrop-blur-md border border-white/50 overflow-hidden">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`min-h-12 px-4 font-medium transition-colors ${
                    filter === f.key
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-h-12 px-4 rounded-2xl bg-white/90 backdrop-blur-md border border-white/50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="date">Date</option>
            </select>
            <Link
              to="/canvas"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:opacity-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              New Drawing
            </Link>
          </div>
        </div>

        {/* Content */}
        {sorted.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-2xl border border-white/50">
            <div className="w-24 h-24 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Palette className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No drawings yet</h2>
            <p className="text-slate-600 mb-6">Start creating your first piece.</p>
            <Link
              to="/canvas"
              className="inline-flex items-center justify-center min-h-12 px-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
            >
              Start Creating
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sorted.map((drawing, i) => (
              <div
                key={drawing.id}
                className="bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50 hover:shadow-indigo-100/50 hover:scale-[1.02] transition-all duration-300"
              >
                <div className="relative w-full aspect-square bg-slate-100 border-b border-slate-100">
                  {drawing.thumbnail && typeof drawing.thumbnail === "string" ? (
                    <img
                      src={drawing.thumbnail}
                      alt={drawing.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <Palette className="w-16 h-16 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-3">
                    <button
                      className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white"
                      title="View"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <Link
                      to="/canvas"
                      className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white"
                      title="Edit"
                    >
                      <Pencil className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(drawing)}
                      className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {drawing.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">{drawing.date}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-xs font-medium ${
                      drawing.type === "lesson"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {drawing.type === "lesson" ? "Lesson" : "Free Draw"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
