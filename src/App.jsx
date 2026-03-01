import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useAppState } from "./context/AppStateContext";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import CanvasPage from "./pages/CanvasPage";
import Gallery from "./pages/Gallery";
import LessonSelect from "./pages/LessonSelect";
import LessonPlay from "./pages/LessonPlay";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Calibration from "./pages/Calibration";
import EligibilityGate from "./pages/EligibilityGate";
import LIPScreener from "./pages/LIPScreener";
import Tutorial from "./pages/Tutorial";

export default function App() {
  const { user, profile, loading: authLoading, signOut, getNextSetupStep } = useAuth();
  const { hydrated } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!user;

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
  };

  useEffect(() => {
    if (!isAuthenticated || !profile || !hydrated) return;
    const next = getNextSetupStep();
    if (next !== "/home" && location.pathname === "/home") {
      navigate(next, { replace: true });
    }
  }, [isAuthenticated, profile, hydrated, getNextSetupStep, location.pathname, navigate]);

  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <p className="text-slate-600 font-medium">Loading…</p>
      </div>
    );
  }

  if (isAuthenticated && !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <p className="text-slate-600 font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && (
        <Navbar
          isAuthenticated={isAuthenticated}
          user={user}
          onSignOut={signOut}
        />
      )}
      <Routes>
        <Route
          path="/"
          element={
            !isAuthenticated ? <Landing /> : <Navigate to="/home" replace />
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

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
          path="/lesson/:id"
          element={
            <ProtectedRoute>
              <LessonPlay />
            </ProtectedRoute>
          }
        />
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
            <ProtectedRoute>
              <Profile user={user} onSignOut={signOut} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calibration"
          element={
            <ProtectedRoute>
              <Calibration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eligibility"
          element={
            <ProtectedRoute>
              <EligibilityGate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutorial"
          element={
            <ProtectedRoute>
              <Tutorial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/screener"
          element={
            <ProtectedRoute>
              <LIPScreener />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
