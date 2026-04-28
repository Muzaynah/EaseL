import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Palette } from "lucide-react";

function formatRelative(ms) {
  if (!ms) return "Saved";
  const diff = Date.now() - ms;
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(ms).toLocaleDateString();
}

/**
 * Gallery shows only real saved drawings (canvas + lesson captures).
 * Backed by localStorage keys:
 *   - "gesture-projects": array of data URLs (legacy free-draw saves)
 *   - "easeL_gallery":    array of { thumbnail, type, createdAt, title } (framework format)
 * We merge both so existing saves are not lost.
 */
export default function Gallery() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try {
      const legacy = JSON.parse(localStorage.getItem("gesture-projects") || "[]");
      const structured = JSON.parse(localStorage.getItem("easeL_gallery") || "[]");
      const legacyMapped = legacy.map((img, i) => ({
        id: `legacy-${i}`,
        title: `Drawing ${legacy.length - i}`,
        createdAt: null,
        type: "free",
        thumbnail: img,
        _legacyIndex: i,
      }));
      const structuredMapped = (Array.isArray(structured) ? structured : []).map((d, i) => ({
        id: `saved-${i}`,
        title: d.title || `Drawing ${i + 1}`,
        createdAt: d.createdAt || null,
        type: d.type === "lesson" ? "lesson" : "free",
        thumbnail: d.thumbnail || "",
        _structuredIndex: i,
      }));
      const merged = [...structuredMapped, ...legacyMapped].sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      );
      setItems(merged);
    } catch {
      setItems([]);
    }
  }, []);

  const filtered =
    filter === "all"
      ? items
      : items.filter((d) => d.type === (filter === "lessons" ? "lesson" : "free"));

  function handleDelete(drawing) {
    if (drawing._legacyIndex != null) {
      const legacy = JSON.parse(localStorage.getItem("gesture-projects") || "[]");
      legacy.splice(drawing._legacyIndex, 1);
      localStorage.setItem("gesture-projects", JSON.stringify(legacy));
    } else if (drawing._structuredIndex != null) {
      const structured = JSON.parse(localStorage.getItem("easeL_gallery") || "[]");
      structured.splice(drawing._structuredIndex, 1);
      localStorage.setItem("easeL_gallery", JSON.stringify(structured));
    }
    setItems((prev) => prev.filter((d) => d.id !== drawing.id));
  }

  const filters = [
    { key: "all", label: "All" },
    { key: "lessons", label: "Lessons" },
    { key: "free", label: "Free Draw" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
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
            <Link
              to="/canvas"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:opacity-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              New drawing
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-2xl border border-white/50">
            <div className="w-24 h-24 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Palette className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No drawings yet</h2>
            <p className="text-slate-600 mb-6">Saved lessons and canvas drawings appear here.</p>
            <Link
              to="/canvas"
              className="inline-flex items-center justify-center min-h-12 px-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
            >
              Start creating
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((drawing) => (
              <div
                key={drawing.id}
                className="bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50 hover:shadow-indigo-100/50 hover:scale-[1.02] transition-all duration-300"
              >
                <div className="relative w-full aspect-square bg-slate-100 border-b border-slate-100">
                  {drawing.thumbnail ? (
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-end gap-2 p-3">
                    <Link
                      to="/canvas"
                      className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white"
                      title="Open in canvas"
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
                  <h3 className="font-semibold text-slate-800 truncate">{drawing.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{formatRelative(drawing.createdAt)}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-xs font-medium ${
                      drawing.type === "lesson"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {drawing.type === "lesson" ? "Lesson" : "Free draw"}
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
