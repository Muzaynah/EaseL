import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
          <h1 className="easeL-heading-1"><span className="easeL-heading-highlight easeL-highlight-coral">My Gallery</span></h1>
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
          <div className="easeL-card p-12 text-center">
            <div
              className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-t-[var(--easeL-primary)]"
              style={{ borderColor: "color-mix(in srgb, var(--easeL-border-subtle) 55%, white)" }}
            />
            <h2 className="easeL-heading-2 mb-2">Loading gallery...</h2>
            <p className="easeL-text-muted">Fetching your saved free-draw projects and lesson results.</p>
          </div>
        ) : loadState === "denied" ? (
          <div className="easeL-card p-12 text-center" style={{ background: "var(--easeL-bg-card-coral)" }}>
            <h2 className="easeL-heading-2 mb-2">Permission denied</h2>
            <p className="easeL-text-muted mb-6">
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
          <div className="easeL-card p-12 text-center" style={{ background: "var(--easeL-bg-card-coral)" }}>
            <h2 className="easeL-heading-2 mb-2">Network error</h2>
            <p className="easeL-text-muted mb-6">
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
          <div className="easeL-card p-12 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "var(--easeL-bg-page)" }}>
              <Palette className="h-12 w-12" style={{ color: "var(--easeL-text-muted)" }} />
            </div>
            <h2 className="easeL-heading-2 mb-2">No drawings yet</h2>
            <p className="easeL-text-muted mb-6">Saved free-draw projects and lesson results appear here.</p>
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
              <h2 className="easeL-heading-2 mb-4"><span className="easeL-heading-highlight easeL-highlight-lavender">Free Draw Projects</span></h2>
              {freeDrawItems.length === 0 ? (
                <div className="rounded-2xl border-2 p-5" style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text-muted)" }}>
                  No free-draw projects saved yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {freeDrawItems.map((drawing) => (
                    <div
                      key={drawing.id}
                      className="easeL-hover-parent easeL-hoverable-card rounded-3xl overflow-hidden border-2"
                      style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/canvas?project=${drawing.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/canvas?project=${drawing.id}`);
                        }
                      }}
                    >
                      <div className="relative w-full aspect-square border-b" style={{ background: "var(--easeL-bg-page)", borderColor: "var(--easeL-border-subtle)" }}>
                        {drawing.thumbnail ? (
                          <img
                            src={drawing.thumbnail}
                            alt={drawing.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--easeL-bg-page)" }}>
                            <Palette className="w-16 h-16" style={{ color: "var(--easeL-text-muted)" }} />
                          </div>
                        )}
                        <div className="easeL-hover-reveal absolute inset-0 opacity-0 easeL-transition-standard flex items-end justify-end gap-2 p-3" style={{ background: "color-mix(in srgb, black 18%, transparent)" }}>
                          <Link
                            to={`/canvas?project=${drawing.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="easeL-interactive flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 hover:bg-white"
                            style={{ color: "var(--easeL-text)" }}
                            title="Open in canvas"
                          >
                            <Pencil className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFree(drawing);
                            }}
                            className="easeL-interactive flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 hover:bg-white"
                            style={{ color: "var(--easeL-accent-coral)" }}
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold truncate" style={{ color: "var(--easeL-text)" }}>{drawing.title}</h3>
                        <p className="text-sm mt-0.5" style={{ color: "var(--easeL-text-muted)" }}>{formatRelative(drawing.createdAt)}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 rounded-lg text-xs font-medium" style={{ background: "var(--easeL-bg-card-butter)", color: "var(--easeL-primary)" }}>
                          Free draw
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="easeL-heading-2 mb-4"><span className="easeL-heading-highlight easeL-highlight-mint">Lesson Results</span></h2>
              {lessonItems.length === 0 ? (
                <div className="rounded-2xl border-2 p-5" style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text-muted)" }}>
                  No lesson results saved yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {lessonItems.map((drawing) => (
                    <div
                      key={drawing.id}
                      className="easeL-hover-parent easeL-hoverable-card rounded-3xl overflow-hidden border-2"
                      style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}
                    >
                      <button
                        type="button"
                        className="relative w-full aspect-square border-b"
                        style={{ background: "var(--easeL-bg-page)", borderColor: "var(--easeL-border-subtle)" }}
                        onClick={() => setSelectedLesson(drawing)}
                      >
                        {drawing.thumbnail ? (
                          <img
                            src={drawing.thumbnail}
                            alt={drawing.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--easeL-bg-page)" }}>
                            <Palette className="w-16 h-16" style={{ color: "var(--easeL-text-muted)" }} />
                          </div>
                        )}
                      </button>
                      <div className="p-4">
                        <h3 className="font-semibold truncate" style={{ color: "var(--easeL-text)" }}>{drawing.title}</h3>
                        <p className="text-sm mt-0.5" style={{ color: "var(--easeL-text-muted)" }}>{formatRelative(drawing.createdAt)}</p>
                        <p className="mt-1 text-sm font-bold" style={{ color: "var(--easeL-text)" }}>
                          Score: {typeof drawing.score === "number" ? `${drawing.score}%` : "n/a"}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium" style={{ background: "var(--easeL-bg-card-coral)", color: "var(--easeL-accent-coral)" }}>
                            Lesson
                          </span>
                          <button
                            onClick={() => deleteLesson(drawing)}
                            className="easeL-interactive flex h-9 w-9 items-center justify-center rounded-xl hover:brightness-95"
                            style={{ background: "var(--easeL-bg-card-coral)", color: "var(--easeL-accent-coral)" }}
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
          <div className="relative max-w-5xl w-full overflow-hidden rounded-3xl bg-white shadow-2xl">
            <button
              type="button"
              className="easeL-interactive absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90"
              style={{ color: "var(--easeL-text)" }}
              onClick={() => setSelectedLesson(null)}
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="border-b p-4" style={{ borderColor: "var(--easeL-border-subtle)" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--easeL-text)" }}>{selectedLesson.title}</h3>
              <p className="text-sm" style={{ color: "var(--easeL-text-muted)" }}>
                Score: {typeof selectedLesson.score === "number" ? `${selectedLesson.score}%` : "n/a"}
              </p>
            </div>
            <div className="flex min-h-[50vh] items-center justify-center p-4" style={{ background: "var(--easeL-bg-page)" }}>
              {selectedLesson.thumbnail ? (
                <img
                  src={selectedLesson.thumbnail}
                  alt={selectedLesson.title}
                  className="max-h-[75vh] w-auto object-contain"
                />
              ) : (
                <div style={{ color: "var(--easeL-text-muted)" }}>No preview</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
