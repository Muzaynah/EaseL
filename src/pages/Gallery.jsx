import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Palette, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  deleteCanvasProjectCloud,
  deleteLessonResultCloud,
  isFirestorePermissionError,
  listCanvasProjectsCloud,
  listLessonResultsCloud,
} from "../firebase/cloudData";

function formatRelative(ms) {
  if (!ms) return "Saved";
  const diff = Date.now() - ms;
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(ms).toLocaleDateString();
}

export default function Gallery() {
  const { user } = useAuth();
  const [freeDrawItems, setFreeDrawItems] = useState([]);
  const [lessonItems, setLessonItems] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | empty | denied | network

  const loadGallery = async (uid, cancelledRef) => {
    if (!uid) {
      setFreeDrawItems([]);
      setLessonItems([]);
      setLoadState("network");
      return;
    }
    setLoadState("loading");
    try {
      const [free, lessons] = await Promise.all([
        listCanvasProjectsCloud(uid),
        listLessonResultsCloud(uid),
      ]);
      if (cancelledRef.current) return;
      setFreeDrawItems(free);
      setLessonItems(lessons);
      setLoadState(free.length + lessons.length === 0 ? "empty" : "ready");
    } catch (e) {
      if (cancelledRef.current) return;
      if (isFirestorePermissionError(e)) {
        setLoadState("denied");
      } else {
        console.warn("gallery cloud load failed", e);
        setLoadState("network");
      }
      setFreeDrawItems([]);
      setLessonItems([]);
    }
  };

  useEffect(() => {
    const cancelledRef = { current: false };
    loadGallery(user?.uid, cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [user?.uid]);

  const totalItems = useMemo(
    () => freeDrawItems.length + lessonItems.length,
    [freeDrawItems.length, lessonItems.length],
  );

  async function deleteFree(item) {
    if (!user?.uid) return;
    try {
      await deleteCanvasProjectCloud(user.uid, item.id);
    } catch (e) {
      if (!isFirestorePermissionError(e)) console.warn("delete free project failed", e);
      return;
    }
    setFreeDrawItems((prev) => prev.filter((d) => d.id !== item.id));
  }

  async function deleteLesson(item) {
    if (!user?.uid) return;
    try {
      await deleteLessonResultCloud(user.uid, item.id);
    } catch (e) {
      if (!isFirestorePermissionError(e)) console.warn("delete lesson result failed", e);
      return;
    }
    setLessonItems((prev) => prev.filter((d) => d.id !== item.id));
    if (selectedLesson?.id === item.id) setSelectedLesson(null);
  }

  return (
    <div className="easeL-page-bg min-h-screen px-6 pb-16 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-slate-800">My Gallery</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/canvas"
              className="easeL-btn-solid inline-flex min-h-12 items-center justify-center gap-2 px-6 transition-all hover:opacity-95"
            >
              <Plus className="w-5 h-5" />
              New drawing
            </Link>
          </div>
        </div>

        {loadState === "loading" ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-2xl border border-white/50">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--easeL-primary)]" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading gallery...</h2>
            <p className="text-slate-600">Fetching your saved free-draw projects and lesson results.</p>
          </div>
        ) : loadState === "denied" ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-2xl border border-amber-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Permission denied</h2>
            <p className="text-slate-600 mb-6">
              We could not read gallery items from cloud storage for this account.
            </p>
            <button
              type="button"
              onClick={() => loadGallery(user?.uid, { current: false })}
              className="easeL-btn-solid inline-flex min-h-12 items-center justify-center px-8 transition-all"
            >
              Retry
            </button>
          </div>
        ) : loadState === "network" ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-2xl border border-rose-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Network error</h2>
            <p className="text-slate-600 mb-6">
              We could not fetch your cloud gallery right now.
            </p>
            <button
              type="button"
              onClick={() => loadGallery(user?.uid, { current: false })}
              className="easeL-btn-solid inline-flex min-h-12 items-center justify-center px-8 transition-all"
            >
              Retry
            </button>
          </div>
        ) : loadState === "empty" || totalItems === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-2xl border border-white/50">
            <div className="w-24 h-24 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Palette className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No drawings yet</h2>
            <p className="text-slate-600 mb-6">Saved free-draw projects and lesson results appear here.</p>
            <Link
              to="/canvas"
              className="easeL-btn-solid inline-flex min-h-12 items-center justify-center px-8 transition-all"
            >
              Start creating
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Free Draw Projects</h2>
              {freeDrawItems.length === 0 ? (
                <div className="rounded-2xl bg-white/80 border border-slate-200 p-5 text-slate-600">
                  No free-draw projects saved yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {freeDrawItems.map((drawing) => (
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
                            to={`/canvas?project=${drawing.id}`}
                            className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white"
                            title="Open in canvas"
                          >
                            <Pencil className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => deleteFree(drawing)}
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
                        <span className="inline-block mt-2 px-2 py-0.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-800">
                          Free draw
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">Lesson Results</h2>
              {lessonItems.length === 0 ? (
                <div className="rounded-2xl bg-white/80 border border-slate-200 p-5 text-slate-600">
                  No lesson results saved yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {lessonItems.map((drawing) => (
                    <div
                      key={drawing.id}
                      className="bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50"
                    >
                      <button
                        type="button"
                        className="relative w-full aspect-square bg-slate-100 border-b border-slate-100"
                        onClick={() => setSelectedLesson(drawing)}
                      >
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
                      </button>
                      <div className="p-4">
                        <h3 className="font-semibold text-slate-800 truncate">{drawing.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{formatRelative(drawing.createdAt)}</p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          Score: {typeof drawing.score === "number" ? `${drawing.score}%` : "n/a"}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-800">
                            Lesson
                          </span>
                          <button
                            onClick={() => deleteLesson(drawing)}
                            className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedLesson ? (
        <div className="fixed inset-0 z-50 bg-black/65 p-6 flex items-center justify-center">
          <div className="relative max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
            <button
              type="button"
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 text-slate-700 flex items-center justify-center"
              onClick={() => setSelectedLesson(null)}
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{selectedLesson.title}</h3>
              <p className="text-slate-600 text-sm">
                Score: {typeof selectedLesson.score === "number" ? `${selectedLesson.score}%` : "n/a"}
              </p>
            </div>
            <div className="bg-slate-50 p-4 flex items-center justify-center min-h-[50vh]">
              {selectedLesson.thumbnail ? (
                <img
                  src={selectedLesson.thumbnail}
                  alt={selectedLesson.title}
                  className="max-h-[75vh] w-auto object-contain"
                />
              ) : (
                <div className="text-slate-500">No preview</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
