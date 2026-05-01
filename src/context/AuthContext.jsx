import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, hasConfig } from "../firebase/config";
import {
  getProfileFromFirestore,
  setProfileInFirestore,
  createProfileInFirestore,
} from "../firebase/profile";
import { hydrateCloudLogs } from "../utils/persistence";
import { getNextSetupStep } from "../utils/setupFlow";
import { createDefaultProfile, normaliseProfile } from "../utils/profileSchema";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileStatus, setProfileStatus] = useState("loading"); // loading | ready | missing | corrupt | error

  const isProfileStructurallyValid = useCallback((p) => {
    if (!p || typeof p !== "object") return false;
    return true;
  }, []);

  const loadProfile = useCallback(async (uid) => {
    if (!hasConfig || !uid) {
      setProfileState(null);
      setProfileStatus("error");
      return null;
    }
    const raw = await getProfileFromFirestore(uid);
    if (!raw) {
      setProfileState(null);
      setProfileStatus("missing");
      await hydrateCloudLogs(uid);
      return null;
    }
    const p = normaliseProfile(raw);
    if (!isProfileStructurallyValid(p)) {
      setProfileState(null);
      setProfileStatus("corrupt");
      await hydrateCloudLogs(uid);
      return null;
    }
    setProfileState(p);
    setProfileStatus("ready");
    await hydrateCloudLogs(uid);
    // Persist the auto-correction so Firestore mirrors the in-memory shape.
    if (
      p &&
      raw &&
      (p.currentStage !== raw.currentStage ||
        p.currentLevel !== raw.currentLevel ||
        p.pathId !== raw.pathId ||
        p.pathLevel !== raw.pathLevel)
    ) {
      try {
        await setProfileInFirestore(uid, p);
      } catch (e) {
        console.warn("profile auto-heal persist failed", e);
      }
    }
    return p;
  }, [isProfileStructurallyValid]);

  const reloadProfile = useCallback(async () => {
    const uid = auth?.currentUser?.uid ?? user?.uid ?? null;
    if (!uid) return null;
    try {
      setProfileStatus("loading");
      return await loadProfile(uid);
    } catch (e) {
      console.warn("reloadProfile failed", e);
      setProfileStatus("error");
      setError("Could not load your profile from cloud.");
      setProfileState(null);
      return null;
    }
  }, [loadProfile, user?.uid]);

  const updateProfile = useCallback(
    async (next) => {
      const uid = user?.uid;
      if (!uid || !hasConfig) {
        throw new Error("Cloud profile is required for updates.");
      }
      const incoming = typeof next === "function" ? next(profile) : next;
      const canonicalStage = Number.isFinite(incoming?.currentStage)
        ? incoming.currentStage
        : Number.isFinite(incoming?.currentLevel)
        ? incoming.currentLevel
        : profile?.currentStage ?? profile?.currentLevel ?? 0;
      const canonicalPathId =
        incoming?.pathId === 1 || incoming?.pathId === 2
          ? incoming.pathId
          : incoming?.lipMode;
      const updated = {
        ...incoming,
        currentStage: canonicalStage,
        currentLevel: canonicalStage, // kept for backwards compatibility until full migration
        pathId: canonicalPathId ?? null,
        lipMode: canonicalPathId ?? incoming?.lipMode ?? null,
      };
      await setProfileInFirestore(uid, updated);
      setProfileState(updated);
      setProfileStatus("ready");
      return updated;
    },
    [user?.uid, profile]
  );

  useEffect(() => {
    if (!hasConfig) {
      setUser(null);
      setProfileState(null);
      setProfileStatus("error");
      setError("Firebase configuration missing. Cloud auth is required.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfileState(null);
        setProfileStatus("loading");
        await hydrateCloudLogs(null);
        setLoading(false);
        return;
      }
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        name: firebaseUser.displayName ?? firebaseUser.email ?? "User",
      });
      try {
        await loadProfile(firebaseUser.uid);
      } catch (e) {
        console.warn("profile load failed", e);
        setProfileState(null);
        setProfileStatus("error");
        setError("Could not load your cloud profile.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadProfile]);

  const signUp = useCallback(
    async (email, password, account) => {
      setError(null);
      if (hasConfig && auth) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const profileData = createDefaultProfile(account);
        profileData.name = account.name ?? cred.user.email ?? "User";
        profileData.email = account.email ?? email;
        await createProfileInFirestore(cred.user.uid, {
          ...account,
          email: account.email ?? email,
          name: account.name ?? profileData.name,
        });
        setUser({
          uid: cred.user.uid,
          email: cred.user.email ?? "",
          name: account.name ?? cred.user.email ?? "User",
        });
        const p = await getProfileFromFirestore(cred.user.uid);
        setProfileState(p);
        setProfileStatus("ready");
        return getNextSetupStep(p);
      }
      throw new Error("Cloud auth is required.");
    },
    []
  );

  const signIn = useCallback(async (email, password) => {
    setError(null);
    if (hasConfig && auth) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const raw = await getProfileFromFirestore(cred.user.uid);
      const p = normaliseProfile(raw);
      setUser({
        uid: cred.user.uid,
        email: cred.user.email ?? "",
        name: p?.name ?? cred.user.displayName ?? cred.user.email ?? "User",
      });
      setProfileState(p);
      setProfileStatus(p ? "ready" : "missing");
      await hydrateCloudLogs(cred.user.uid);
      if (
        p &&
        raw &&
        (p.currentStage !== raw.currentStage ||
          p.currentLevel !== raw.currentLevel ||
          p.pathId !== raw.pathId ||
          p.pathLevel !== raw.pathLevel)
      ) {
        try {
          await setProfileInFirestore(cred.user.uid, p);
        } catch (e) {
          console.warn("profile auto-heal persist failed", e);
        }
      }
      return getNextSetupStep(p);
    }
    throw new Error("Cloud auth is required.");
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    if (hasConfig && auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setProfileState(null);
    setProfileStatus("loading");
  }, []);

  const value = {
    user,
    profile,
    loading,
    profileStatus,
    error,
    setError,
    signUp,
    signIn,
    signOut,
    updateProfile,
    reloadProfile,
    getNextSetupStep: profile ? () => getNextSetupStep(profile) : () => "/calibration",
    isFirebaseReady: hasConfig,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
