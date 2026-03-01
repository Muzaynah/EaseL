import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, hasConfig } from "./config";
import { createDefaultProfile } from "../utils/profileSchema";

const PROFILES_COLLECTION = "profiles";

export async function getProfileFromFirestore(userId) {
  if (!hasConfig || !db || !userId) return null;
  const ref = doc(db, PROFILES_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function setProfileInFirestore(userId, data) {
  if (!hasConfig || !db || !userId) return null;
  const ref = doc(db, PROFILES_COLLECTION, userId);
  const payload = {
    ...data,
    updatedAt: Date.now(),
  };
  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function createProfileInFirestore(userId, account) {
  if (!hasConfig || !db || !userId) return null;
  const profile = createDefaultProfile(account);
  profile.updatedAt = profile.createdAt;
  const ref = doc(db, PROFILES_COLLECTION, userId);
  await setDoc(ref, profile);
  return profile;
}
