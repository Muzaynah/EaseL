import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  LogOut,
  Target,
  RefreshCcw,
  Download,
  Check,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { getTrialLog, getSessionLog } from "../utils/persistence";
import { buildCaregiverExport, downloadCaregiverExport } from "../utils/dataExport";

const MS_PER_HOUR = 1000 * 60 * 60;

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Caregiver-facing profile screen. No invented metrics — every field below is derived
 * from profile + trial/session logs. Framework §9 forbids surfacing anything we don't store.
 */
export default function Profile({ user, onSignOut }) {
  const navigate = useNavigate();
  const { profile, settings } = useAppState();
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    const payload = buildCaregiverExport({ profile, settings });
    downloadCaregiverExport(payload);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };
  const displayName = user?.name ?? profile?.name ?? "User";
  const email = user?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const trialLog = typeof window !== "undefined" ? getTrialLog() : [];
  const sessionLog = typeof window !== "undefined" ? getSessionLog() : [];
  const attempts = trialLog.length;
  const successes = trialLog.filter((t) => t.success).length;
  const totalSessions = sessionLog.length;
  const totalPracticeMs = sessionLog.reduce((a, s) => a + (s.durationMs || 0), 0);
  const practiceHours = (totalPracticeMs / MS_PER_HOUR).toFixed(1);

  const setup = [
    {
      label: "Eligibility",
      value:
        profile?.eligibilityPassed === true
          ? "Passed"
          : profile?.eligibilityPassed === false
          ? "Failed"
          : "Not completed",
    },
    {
      label: "Calibration",
      value: formatDate(profile?.calibration?.lastCalibratedAt),
    },
    {
      label: "Tutorial",
      value: profile?.tutorialPassed ? "Completed" : "Not completed",
    },
    {
      label: "Path assignment",
      value: (profile?.pathId ?? profile?.lipMode)
        ? `Path ${profile?.pathId ?? profile?.lipMode} · ${
            (profile?.pathId ?? profile?.lipMode) === 1
              ? (profile?.pathLevel ?? (profile?.lipTier === 1 ? 1 : 2)) === 1
                ? "Level 1"
                : "Level 2"
              : (profile?.pathLevel ?? (profile?.lipTier === 3 ? 1 : 2)) === 1
              ? "Level 1"
              : "Level 2"
          }`
        : "Not assigned",
    },
    {
      label: "Use category",
      value:
        profile?.independentUse == null
          ? "—"
          : profile.independentUse
          ? "Independent-use"
          : "Assisted-use",
    },
    {
      label: "Current level",
      value: `Level ${(profile?.currentLevel ?? profile?.currentStage ?? 0) + 1}`,
    },
  ];

  const usage = [
    { label: "Sessions logged", value: `${totalSessions}` },
    { label: "Trial attempts", value: `${attempts}` },
    { label: "Successful attempts", value: `${successes}` },
    { label: "Practice time", value: `${practiceHours} h` },
  ];

  const m = profile?.screenerMetrics || null;
  const metricRows = m
    ? [
        { label: "S1 · Reaction", value: m.s1ReactionMs != null ? `${Math.round(m.s1ReactionMs)} ms` : "—" },
        { label: "S2 · Hold", value: m.s2HoldMs != null ? `${Math.round(m.s2HoldMs)} ms` : "—" },
        {
          label: "S3 · Activation",
          value:
            m.s3Hits != null && m.s3Total
              ? `${m.s3Hits} / ${m.s3Total}`
              : "—",
        },
        {
          label: "S4 · Corridor",
          value:
            m.s4TimeMs != null
              ? `${Math.round(m.s4TimeMs)} ms · ${m.s4Deviations ?? 0} dev`
              : "—",
        },
        {
          label: "S5 · Fatigue",
          value:
            m.s5Round1Ms && m.s5Round2Ms
              ? `${(m.s5Round2Ms / m.s5Round1Ms).toFixed(2)}×`
              : "—",
        },
      ]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-800">{displayName}</h1>
              {email && <p className="text-slate-600 mt-1 truncate">{email}</p>}
              <p className="text-sm text-slate-500 mt-2">
                This page is for caregiver reference. The child interacts with Home and Lessons.
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Setup status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {setup.map((item) => (
              <div
                key={item.label}
                className="bg-white/90 backdrop-blur-md rounded-2xl px-5 py-4 shadow-lg border border-white/50"
              >
                <p className="text-xs text-slate-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-base font-bold text-slate-800 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Usage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {usage.map((item) => (
              <div
                key={item.label}
                className="bg-white/90 backdrop-blur-md rounded-2xl px-5 py-4 shadow-lg border border-white/50"
              >
                <p className="text-xs text-slate-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {metricRows && (
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Screener metrics</h2>
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/50 shadow-2xl divide-y divide-slate-100 overflow-hidden">
              {metricRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3">
                  <p className="text-slate-700 font-medium">{row.label}</p>
                  <p className="font-mono text-slate-800">{row.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/50 space-y-1">
          <Link
            to="/calibration"
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-indigo-50 transition-colors text-slate-700"
          >
            <Target className="w-5 h-5 text-indigo-500" />
            Re-run calibration
          </Link>
          <Link
            to="/screener"
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-indigo-50 transition-colors text-slate-700"
          >
            <RefreshCcw className="w-5 h-5 text-indigo-500" />
            Re-run screener
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-indigo-50 transition-colors text-slate-700"
          >
            <SettingsIcon className="w-5 h-5 text-indigo-500" />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-indigo-50 transition-colors text-slate-700 text-left"
          >
            {exported ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <Download className="w-5 h-5 text-indigo-500" />
            )}
            <div className="flex-1">
              <p className="font-medium">Export caregiver data (JSON)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Only derived metrics — no video, no biometric templates (§9.2).
              </p>
            </div>
            {exported && (
              <span className="text-emerald-600 text-sm font-medium">Downloaded</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              onSignOut?.();
              navigate("/");
            }}
            className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-red-50 transition-colors text-red-600 font-semibold text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
