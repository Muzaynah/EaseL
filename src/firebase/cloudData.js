import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, hasConfig } from "./config";

export function isFirestorePermissionError(error) {
  return (
    error?.code === "permission-denied" ||
    String(error?.message || "").includes("Missing or insufficient permissions")
  );
}

function requireDb() {
  if (!hasConfig || !db) return false;
  return true;
}

function profilePath(uid) {
  return `profiles/${uid}`;
}

function withCreatedAt(payload) {
  return {
    ...payload,
    createdAt: payload.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    createdAtServer: serverTimestamp(),
  };
}

export async function saveCanvasProjectCloud(uid, project) {
  if (!uid || !requireDb()) return null;
  const cleanLayers = Array.isArray(project.layers)
    ? project.layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible !== false,
        canvasData: l.canvasData || "",
      }))
    : [];
  const payload = withCreatedAt({
    type: "free",
    title: project.title || "Free Draw",
    width: project.width ?? 1200,
    height: project.height ?? 700,
    activeLayerId: project.activeLayerId ?? cleanLayers[0]?.id ?? null,
    layers: cleanLayers,
    thumbnail: project.thumbnail || "",
  });
  if (project.id) {
    const ref = doc(db, `${profilePath(uid)}/canvasProjects/${project.id}`);
    await setDoc(ref, payload, { merge: true });
    return project.id;
  }
  const ref = await addDoc(collection(db, `${profilePath(uid)}/canvasProjects`), payload);
  return ref.id;
}

export async function listCanvasProjectsCloud(uid) {
  if (!uid || !requireDb()) return [];
  const q = query(
    collection(db, `${profilePath(uid)}/canvasProjects`),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCanvasProjectCloud(uid, projectId) {
  if (!uid || !projectId || !requireDb()) return null;
  const ref = doc(db, `${profilePath(uid)}/canvasProjects/${projectId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function deleteCanvasProjectCloud(uid, projectId) {
  if (!uid || !projectId || !requireDb()) return;
  await deleteDoc(doc(db, `${profilePath(uid)}/canvasProjects/${projectId}`));
}

export async function saveLessonResultCloud(uid, lesson) {
  if (!uid || !requireDb()) return null;
  const payload = withCreatedAt({
    type: "lesson",
    title: lesson.title || "Lesson",
    stage: lesson.stage ?? null,
    score: typeof lesson.score === "number" ? lesson.score : null,
    passed: Boolean(lesson.passed),
    thumbnail: lesson.thumbnail || "",
  });
  const ref = await addDoc(collection(db, `${profilePath(uid)}/lessonResults`), payload);
  return ref.id;
}

export async function listLessonResultsCloud(uid) {
  if (!uid || !requireDb()) return [];
  const q = query(
    collection(db, `${profilePath(uid)}/lessonResults`),
    orderBy("createdAt", "desc"),
    limit(400),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteLessonResultCloud(uid, lessonId) {
  if (!uid || !lessonId || !requireDb()) return;
  await deleteDoc(doc(db, `${profilePath(uid)}/lessonResults/${lessonId}`));
}

export async function appendCloudLog(uid, type, entry) {
  if (!uid || !requireDb()) return null;
  const allowed = new Set(["trialLogs", "sessionLogs", "telemetryLogs"]);
  if (!allowed.has(type)) return null;
  const payload = withCreatedAt({
    ...entry,
    timestamp: entry.timestamp ?? Date.now(),
    userId: uid,
  });
  const ref = await addDoc(collection(db, `${profilePath(uid)}/${type}`), payload);
  return ref.id;
}

export async function listCloudLogs(uid, type, maxItems = 800) {
  if (!uid || !requireDb()) return [];
  const allowed = new Set(["trialLogs", "sessionLogs", "telemetryLogs"]);
  if (!allowed.has(type)) return [];
  const q = query(
    collection(db, `${profilePath(uid)}/${type}`),
    orderBy("timestamp", "desc"),
    limit(maxItems),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}
