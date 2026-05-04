import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useAppState } from "./context/AppStateContext";
import { getNextSetupStep, isSetupRoute } from "./utils/setupFlow";
import Navbar from "./components/Navbar";
import DevMenu from "./components/DevMenu";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import CanvasPage from "./pages/CanvasPage";
import Gallery from "./pages/Gallery";
import LessonSelect from "./pages/LessonSelect";
import LessonPath1 from "./pages/lessons/LessonPath1";
import LessonPath2 from "./pages/lessons/LessonPath2";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Calibration from "./pages/Calibration";
import PathScreener from "./pages/PathScreener";
import Tutorial from "./pages/Tutorial";
import CaregiverProgress from "./pages/CaregiverProgress";
import GlobalEaseLCursor from "./components/GlobalEaseLCursor";
import SettingsModal from "./components/SettingsModal";
import { CursorPositionBridgeProvider } from "./context/CursorPositionBridgeContext";

export default function App() {
  const {
    user,
    profile,
    loading: authLoading,
    signOut,
    profileStatus,
    reloadProfile,
    error: authError,
  } = useAuth();
  const { hydrated, setProfile, settings } = useAppState();
  const location = useLocation();

  const isAuthenticated = !!user;

  // Must be declared before any early returns — Rules of Hooks
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);

  /**
   * ProtectedRoute: requires authentication + enforces setup order.
   * When the user's next required step isn't the current page, redirect to it.
   * Accepts `allowDuringSetup` for the setup pages themselves (calibration/tutorial/screener),
   * and `caregiver` for pages caregivers may access anytime (settings/profile).
   */
  const ProtectedRoute = ({ children, allowDuringSetup = false, caregiver = false }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!profile || !hydrated) return null;
    const next = getNextSetupStep(profile);
    const setupComplete = next === "/home";
    if (setupComplete) return children;
    if (allowDuringSetup && location.pathname === next) return children;
    if (caregiver) return children;
    return <Navigate to={next} replace />;
  };

  if (authLoading && !user) {
    return (
      <div className="easeL-loading-screen" role="status" aria-live="polite">
        <p>Loading…</p>
      </div>
    );
  }

  if (isAuthenticated && !hydrated) {
    return (
      <div className="easeL-loading-screen" role="status" aria-live="polite">
        <p>Loading…</p>
      </div>
    );
  }

  if (isAuthenticated && (profileStatus === "missing" || profileStatus === "corrupt" || profileStatus === "error")) {
    return (
      <div className="easeL-loading-screen px-6">
        <div className="max-w-xl rounded-3xl border border-rose-200 bg-white p-6 text-left shadow-xl">
          <h2 className="text-2xl font-bold text-slate-800">Profile recovery required</h2>
          <p className="mt-2 text-slate-600">
            {profileStatus === "missing"
              ? "Your cloud profile is missing. Please retry loading or sign out and sign in again."
              : profileStatus === "corrupt"
              ? "Your cloud profile data looks invalid. Please retry loading. If this persists, contact support."
              : authError || "We could not load your cloud profile."}
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" className="easeL-btn-solid w-auto px-4" onClick={() => reloadProfile()}>
              Retry
            </button>
            <button
              type="button"
              className="easeL-btn-outline w-auto px-4"
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inSetup = isSetupRoute(location.pathname);
  const navLanguage = profile?.caregiverReported?.language ?? "en";
  const handleNavLanguageChange = (lang) => {
    if (!setProfile) return;
    setProfile((p) => ({
      ...(p || {}),
      caregiverReported: { ...(p?.caregiverReported || {}), language: lang },
    }));
  };

  return (
    <CursorPositionBridgeProvider>
      <>
      <a
        href="#main-content"
        className="easeL-skip-link"
      >
        Skip to main content
      </a>
      <Navbar
        isAuthenticated={isAuthenticated}
        user={user}
        profile={profile}
        inSetup={inSetup}
        onSignOut={signOut}
        onOpenSettings={() => setGlobalSettingsOpen(true)}
        language={navLanguage}
        onLanguageChange={handleNavLanguageChange}
      />
      <GlobalEaseLCursor />
      <DevMenu />
      <SettingsModal isOpen={globalSettingsOpen} onClose={() => setGlobalSettingsOpen(false)} />
        <main id="main-content" tabIndex={-1}>
          <div key={location.pathname} className="easeL-route-transition">
          <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Setup flow routes — reachable only in the correct order */}
        <Route
          path="/calibration"
          element={
            <ProtectedRoute allowDuringSetup caregiver>
              <Calibration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutorial"
          element={
            <ProtectedRoute allowDuringSetup>
              <Tutorial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/screener"
          element={
            <ProtectedRoute allowDuringSetup>
              <PathScreener />
            </ProtectedRoute>
          }
        />

        {/* Post-setup app routes — all blocked until setup is complete */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/canvas"
          element={
            <ProtectedRoute>
              <CanvasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lessons"
          element={
            <ProtectedRoute>
              <LessonSelect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lesson-path1"
          element={
            <ProtectedRoute>
              <LessonPath1 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lesson-path2"
          element={
            <ProtectedRoute>
              <LessonPath2 />
            </ProtectedRoute>
          }
        />
        <Route path="/lesson-mode1" element={<Navigate to="/lesson-path1" replace />} />
        <Route path="/lesson-mode2" element={<Navigate to="/lesson-path2" replace />} />
        <Route
          path="/gallery"
          element={
            <ProtectedRoute>
              <Gallery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute caregiver>
              <Profile user={user} onSignOut={signOut} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute caregiver>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute caregiver>
              <CaregiverProgress />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
        </main>
      </>
    </CursorPositionBridgeProvider>
  );
}
