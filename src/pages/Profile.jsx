import { Link, useNavigate } from "react-router-dom";
import { User, Settings, LogOut, Target, Award } from "lucide-react";

export default function Profile({ user, onSignOut }) {
  const navigate = useNavigate();
  const displayName = user?.name ?? "User";
  const email = user?.email ?? "user@example.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const stats = [
    { label: "Total Drawings", value: "15" },
    { label: "Lessons Completed", value: "3/12", progress: 3 / 12 },
    { label: "Practice Time", value: "5.2 hours" },
    { label: "Current Streak", value: "3 days" },
  ];

  const achievements = [
    { id: "first", title: "First Drawing", unlocked: true },
    { id: "five", title: "Complete 5 Lessons", unlocked: false, progress: "3/5" },
    { id: "streak", title: "Week Streak", unlocked: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Profile header */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">{displayName}</h1>
              <p className="text-slate-600 mt-1">{email}</p>
              <p className="text-sm text-slate-500 mt-1">Member since January 2025</p>
              <button
                type="button"
                className="mt-4 min-h-12 px-6 rounded-2xl border-2 border-indigo-500 text-indigo-600 font-semibold hover:bg-indigo-50 transition-all"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/50"
              >
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                {stat.progress != null && (
                  <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${stat.progress * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/50">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-500" />
            Achievements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`rounded-2xl p-4 border ${
                  a.unlocked ? "bg-indigo-50/80 border-indigo-200" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      a.unlocked ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {a.unlocked ? (
                      <span className="text-lg font-bold">✓</span>
                    ) : (
                      <Award className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${a.unlocked ? "text-slate-800" : "text-slate-500"}`}>
                      {a.title}
                    </p>
                    {a.progress && (
                      <p className="text-sm text-slate-500">{a.progress}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/50 space-y-3">
          <Link
            to="/calibration"
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-indigo-50 transition-colors text-slate-700"
          >
            <Target className="w-5 h-5 text-indigo-500" />
            Calibration
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-indigo-50 transition-colors text-slate-700"
          >
            <Settings className="w-5 h-5 text-indigo-500" />
            Accessibility Settings
          </Link>
          <button
            type="button"
            className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-slate-50 transition-colors text-slate-700 text-left"
          >
            Privacy & Security
          </button>
          <button
            type="button"
            onClick={() => { onSignOut?.(); navigate("/"); }}
            className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-red-50 transition-colors text-red-600 font-semibold text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
