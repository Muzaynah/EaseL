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
import { getNextSetupStep } from "../utils/setupFlow";
import { createDefaultProfile, normaliseProfile } from "../utils/profileSchema";

const DEMO_USER_KEY = "easeL_demoUser";
const DEMO_PROFILE_KEY = "easeL_demoProfile";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async (uid) => {
    if (hasConfig && uid) {
      const raw = await getProfileFromFirestore(uid);
      const p = normaliseProfile(raw);
      setProfileState(p);
      // Persist the auto-correction so Firestore mirrors the in-memory shape
      // and the user's recent-trials query in the lessons reads correctly.
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
    }
    try {
      const raw = localStorage.getItem(DEMO_PROFILE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const p = normaliseProfile(parsed);
      setProfileState(p);
      if (
        p &&
        parsed &&
        (p.currentStage !== parsed.currentStage ||
          p.currentLevel !== parsed.currentLevel ||
          p.pathId !== parsed.pathId ||
          p.pathLevel !== parsed.pathLevel)
      ) {
        try {
          localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(p));
        } catch (e) {
          console.warn("demo profile auto-heal persist failed", e);
        }
      }
      return p;
    } catch {
      setProfileState(null);
      return null;
    }
  }, []);

  const updateProfile = useCallback(
    async (next) => {
      const uid = user?.uid;
      if (!uid && !hasConfig) {
        const updated = typeof next === "function" ? next(profile) : next;
        setProfileState(updated);
        try {
          localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn("demo profile save failed", e);
        }
        return updated;
      }
      if (!uid) return profile;
      const updated = typeof next === "function" ? next(profile) : next;
      await setProfileInFirestore(uid, updated);
      setProfileState(updated);
      return updated;
    },
    [user?.uid, profile]
  );

  useEffect(() => {
    if (!hasConfig) {
      const raw = localStorage.getItem(DEMO_USER_KEY);
      if (raw) {
        try {
          const u = JSON.parse(raw);
          setUser(u);
          loadProfile(null);
        } catch {
          setUser(null);
          setProfileState(null);
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfileState(null);
        setLoading(false);
        return;
      }
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        name: firebaseUser.displayName ?? firebaseUser.email ?? "User",
      });
      await loadProfile(firebaseUser.uid);
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
        return getNextSetupStep(p);
      }
      const demoUser = {
        uid: "demo-" + Date.now(),
        email: account.email ?? email,
        name: account.name ?? "User",
      };
      const demoProfile = createDefaultProfile(account);
      demoProfile.name = demoUser.name;
      demoProfile.email = demoUser.email;
      try {
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(demoProfile));
      } catch (e) {
        console.warn("demo save failed", e);
      }
      setUser(demoUser);
      setProfileState(demoProfile);
      return getNextSetupStep(demoProfile);
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
    const raw = localStorage.getItem(DEMO_USER_KEY);
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u.email === email) {
          setUser(u);
          const pr = localStorage.getItem(DEMO_PROFILE_KEY);
          const parsed = pr ? JSON.parse(pr) : null;
          const p = normaliseProfile(parsed);
          setProfileState(p);
          return getNextSetupStep(p);
        }
      } catch {
        // ignore
      }
    }
    setError("No account found. Sign up first.");
    return null;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    if (hasConfig && auth) {
      await firebaseSignOut(auth);
    }
    try {
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem(DEMO_PROFILE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setProfileState(null);
  }, []);

  const value = {
    user,
    profile,
    loading,
    error,
    setError,
    signUp,
    signIn,
    signOut,
    updateProfile,
    getNextSetupStep: profile ? () => getNextSetupStep(profile) : () => "/eligibility",
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
