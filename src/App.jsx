import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import Path1Lesson from "./screens/Path1Lesson";
import Path2Lesson from "./screens/Path2Lesson";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Calibration from "./pages/Calibration";
import EligibilityGate from "./pages/EligibilityGate";
import PathScreener from "./pages/PathScreener";
import Tutorial from "./pages/Tutorial";
import CaregiverProgress from "./pages/CaregiverProgress";

export default function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { hydrated } = useAppState();
  const location = useLocation();

  const isAuthenticated = !!user;

  /**
   * ProtectedRoute: requires authentication + enforces setup order.
   * When the user's next required step isn't the current page, redirect to it.
   * Accepts `allowDuringSetup` for the setup pages themselves (eligibility/calibration/etc.),
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

  const inSetup = isSetupRoute(location.pathname);

  return (
    <>
      <Navbar
        isAuthenticated={isAuthenticated}
        user={user}
        profile={profile}
        inSetup={inSetup}
        onSignOut={signOut}
      />
      <DevMenu />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Setup flow routes — reachable only in the correct order */}
        <Route
          path="/eligibility"
          element={
            <ProtectedRoute allowDuringSetup>
              <EligibilityGate />
            </ProtectedRoute>
          }
        />
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
              <Path1Lesson />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lesson-path2"
          element={
            <ProtectedRoute>
              <Path2Lesson />
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
    </>
  );
}
