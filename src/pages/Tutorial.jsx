import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Placeholder Tutorial step in the setup flow.
 * Completes when user continues; then navigates to LIP Screener.
 */
export default function Tutorial() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  const handleComplete = async () => {
    await updateProfile((p) => ({ ...p, tutorialPassed: true }));
    navigate("/screener", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Tutorial</h1>
        <p className="text-slate-600 mb-6">
          A short head-driven tutorial will go here. For now, click below to continue to the LIP Screener.
        </p>
        <button
          type="button"
          onClick={handleComplete}
          className="w-full min-h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
        >
          Continue to LIP Screener
        </button>
      </div>
    </div>
  );
}
