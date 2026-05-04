import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Palette, X, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  deleteCanvasProjectCloud,
  deleteLessonResultCloud,
  getCanvasProjectCloud,
  isFirestorePermissionError,
  listCanvasProjectsCloud,
  listLessonResultsCloud,
} from "../firebase/cloudData";

function formatRelative(ms, ur = false) {
  if (!ms) return ur ? "محفوظ" : "Saved";
  const diff = Date.now() - ms;
  const day = 86_400_000;
  if (diff < day) return ur ? "آج" : "Today";
  if (diff < 2 * day) return ur ? "کل" : "Yesterday";
  if (diff < 7 * day) return ur ? `${Math.floor(diff / day)} دن پہلے` : `${Math.floor(diff / day)} days ago`;
  return new Date(ms).toLocaleDateString();
}

export default function Gallery() {
  const { user, profile } = useAuth();
  const ur = (profile?.caregiverReported?.language ?? "en") === "ur";
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

  function downloadBlobUrl(blobUrl, filename) {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  function downloadImageUrl(url, filename) {
    if (!url) return;
    if (url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      return;
    }
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        downloadBlobUrl(blobUrl, filename);
      })
      .catch((error) => console.warn("download image failed", error));
  }

  async function exportFreeDrawProject(item) {
    if (!user?.uid) return;
    let project = item;
    if (!project.layers) {
      try {
        project = await getCanvasProjectCloud(user.uid, item.id);
      } catch (e) {
        console.warn("failed to load project for export", e);
      }
    }
    if (!project) return;

    const width = project.width || 1200;
    const height = project.height || 700;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const visibleLayers = Array.isArray(project.layers)
      ? project.layers.filter((layer) => layer.visible !== false)
      : [];

    if (visibleLayers.length === 0) {
      const name = project.title || "Free_Draw";
      downloadImageUrl(project.thumbnail, `${name.replace(/\s+/g, "_")}.png`);
      return;
    }

    let loadedCount = 0;
    return new Promise((resolve) => {
      visibleLayers.forEach((layer) => {
        const src = layer.canvasData || layer.thumbnail || "";
        if (!src) {
          loadedCount += 1;
          if (loadedCount === visibleLayers.length) {
            const filename = `${(project.title || "Free_Draw").replace(/\s+/g, "_")}.png`;
            downloadImageUrl(tempCanvas.toDataURL("image/png"), filename);
            resolve();
          }
          return;
        }
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          loadedCount += 1;
          if (loadedCount === visibleLayers.length) {
            const filename = `${(project.title || "Free_Draw").replace(/\s+/g, "_")}.png`;
            downloadImageUrl(tempCanvas.toDataURL("image/png"), filename);
            resolve();
          }
        };
        img.onerror = () => {
          loadedCount += 1;
          if (loadedCount === visibleLayers.length) {
            const filename = `${(project.title || "Free_Draw").replace(/\s+/g, "_")}.png`;
            downloadImageUrl(tempCanvas.toDataURL("image/png"), filename);
            resolve();
          }
        };
        img.src = src;
      });
    });
  }

  function exportLessonResult(item) {
    const filename = `${(item.title || "Lesson_Result").replace(/\s+/g, "_")}.png`;
    if (item.thumbnail) {
      downloadImageUrl(item.thumbnail, filename);
      return;
    }
    console.warn("No thumbnail available to export for lesson result", item.id);
  }

  return (
    <div className="easeL-page-bg min-h-screen px-6 pb-16 easeL-page-top">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className={`easeL-heading-1 ${ur ? "ur" : ""}`}>{ur ? "میری گیلری" : "My Gallery"}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/canvas"
              className="easeL-btn-solid inline-flex min-h-12 items-center justify-center gap-2 px-6 transition-all hover:opacity-95"
            >
              <Plus className="w-5 h-5" />
              <span className={ur ? "ur" : ""}>{ur ? "نئی ڈرائنگ" : "New drawing"}</span>
            </Link>
          </div>
        </div>

        {loadState === "loading" ? (
          <div className="easeL-card p-12 text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-[var(--easeL-border-subtle)] border-t-[var(--easeL-primary)]" aria-hidden />
            <h2 className={`easeL-heading-2 mb-2 ${ur ? "ur" : ""}`}>{ur ? "گیلری لوڈ ہو رہی ہے..." : "Loading gallery..."}</h2>
            <p className={`easeL-text-muted ${ur ? "ur" : ""}`}>{ur ? "آپ کی ڈرائنگز اور سبق لوڈ ہو رہے ہیں۔" : "Fetching your saved free-draw projects and lesson results."}</p>
          </div>
        ) : loadState === "denied" ? (
          <div className="easeL-card p-12 text-center" style={{ background: "var(--easeL-bg-card-coral)" }}>
            <h2 className={`easeL-heading-2 mb-2 ${ur ? "ur" : ""}`}>{ur ? "اجازت نہیں" : "Permission denied"}</h2>
            <p className={`easeL-text-muted mb-6 ${ur ? "ur" : ""}`}>
              {ur ? "اس account کی گیلری نہیں کھل سکی۔" : "We could not read gallery items from cloud storage for this account."}
            </p>
            <button type="button" onClick={() => loadGallery(user?.uid, { current: false })}
              className="easeL-btn-solid inline-flex min-h-12 items-center justify-center px-8 transition-all">
              <span className={ur ? "ur" : ""}>{ur ? "دوبارہ کوشش" : "Retry"}</span>
            </button>
          </div>
        ) : loadState === "network" ? (
          <div className="easeL-card p-12 text-center" style={{ background: "var(--easeL-bg-card-coral)" }}>
            <h2 className={`easeL-heading-2 mb-2 ${ur ? "ur" : ""}`}>{ur ? "نیٹ ورک خرابی" : "Network error"}</h2>
            <p className={`easeL-text-muted mb-6 ${ur ? "ur" : ""}`}>
              {ur ? "ابھی گیلری نہیں کھل سکی، دوبارہ کوشش کریں۔" : "We could not fetch your cloud gallery right now."}
            </p>
            <button type="button" onClick={() => loadGallery(user?.uid, { current: false })}
              className="easeL-btn-solid inline-flex min-h-12 items-center justify-center px-8 transition-all">
              <span className={ur ? "ur" : ""}>{ur ? "دوبارہ کوشش" : "Retry"}</span>
            </button>
          </div>
        ) : loadState === "empty" || totalItems === 0 ? (
          <div className="easeL-card p-12 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "var(--easeL-bg-page)" }}>
              <Palette className="h-12 w-12" style={{ color: "var(--easeL-text-muted)" }} />
            </div>
            <h2 className={`easeL-heading-2 mb-2 ${ur ? "ur" : ""}`}>{ur ? "ابھی کوئی ڈرائنگ نہیں" : "No drawings yet"}</h2>
            <p className={`easeL-text-muted mb-6 ${ur ? "ur" : ""}`}>{ur ? "آپ کی محفوظ ڈرائنگز یہاں نظر آئیں گی۔" : "Saved free-draw projects and lesson results appear here."}</p>
            <Link to="/canvas" className="easeL-btn-solid inline-flex min-h-12 items-center justify-center px-8 transition-all">
              <span className={ur ? "ur" : ""}>{ur ? "بنانا شروع کریں" : "Start creating"}</span>
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-10">
              <h2 className={`easeL-heading-2 mb-4 ${ur ? "ur" : ""}`}>{ur ? "آزاد ڈرائنگز" : "Free Draw Projects"}</h2>
              {freeDrawItems.length === 0 ? (
                <div className={`rounded-2xl border-2 p-5 ${ur ? "ur" : ""}`} style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text-muted)" }}>
                  {ur ? "ابھی کوئی آزاد ڈرائنگ محفوظ نہیں۔" : "No free-draw projects saved yet."}
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
                              exportFreeDrawProject(drawing);
                            }}
                            className="easeL-interactive flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 hover:bg-white"
                            style={{ color: "var(--easeL-text)" }}
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
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
                        <p className="text-sm mt-0.5" style={{ color: "var(--easeL-text-muted)" }}>{formatRelative(drawing.createdAt, ur)}</p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-xs font-medium ${ur ? "ur" : ""}`} style={{ background: "var(--easeL-bg-card-butter)", color: "var(--easeL-primary)" }}>
                          {ur ? "آزاد ڈرائنگ" : "Free draw"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className={`easeL-heading-2 mb-4 ${ur ? "ur" : ""}`}>{ur ? "سبق کے نتائج" : "Lesson Results"}</h2>
              {lessonItems.length === 0 ? (
                <div className={`rounded-2xl border-2 p-5 ${ur ? "ur" : ""}`} style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text-muted)" }}>
                  {ur ? "ابھی کوئی سبق محفوظ نہیں۔" : "No lesson results saved yet."}
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
                        <p className="text-sm mt-0.5" style={{ color: "var(--easeL-text-muted)" }}>{formatRelative(drawing.createdAt, ur)}</p>
                        <p className={`mt-1 text-sm font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
                          {ur ? "اسکور" : "Score"}: {typeof drawing.score === "number" ? `${drawing.score}%` : "n/a"}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${ur ? "ur" : ""}`} style={{ background: "var(--easeL-bg-card-coral)", color: "var(--easeL-accent-coral)" }}>
                            {ur ? "سبق" : "Lesson"}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => exportLessonResult(drawing)}
                              className="easeL-interactive flex h-9 w-9 items-center justify-center rounded-xl hover:brightness-95"
                              style={{ background: "var(--easeL-bg-section)", color: "var(--easeL-text)" }}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
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
              <p className={`text-sm ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                {ur ? "اسکور" : "Score"}: {typeof selectedLesson.score === "number" ? `${selectedLesson.score}%` : "n/a"}
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
                <div className={ur ? "ur" : ""} style={{ color: "var(--easeL-text-muted)" }}>{ur ? "کوئی preview نہیں" : "No preview"}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
