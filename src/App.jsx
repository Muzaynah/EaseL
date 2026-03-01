import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const { hydrated } = useAppState();

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

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
          onSignOut={() => {
            setIsAuthenticated(false);
            setUser(null);
          }}
        />
      )}
      <Routes>
        <Route
          path="/"
          element={
            !isAuthenticated ? <Landing /> : <Navigate to="/home" replace />
          }
        />
        <Route
          path="/login"
          element={
            <Login
              setAuth={setIsAuthenticated}
              setUser={setUser}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <SignUp
              setAuth={setIsAuthenticated}
              setUser={setUser}
            />
          }
        />

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
              <Profile user={user} onSignOut={() => { setIsAuthenticated(false); setUser(null); }} />
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
