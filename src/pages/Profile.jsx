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
import {
  buildCaregiverReadableReport,
  downloadCaregiverReportPdf,
  downloadCaregiverReportPng,
} from "../utils/dataExport";
import { firstStageForMode, pathLessonDisplayLevel } from "../utils/lessonContent";

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

  const handleExportPdf = () => {
    const report = buildCaregiverReadableReport({
      profile,
      settings,
      userId: user?.uid ?? "local",
    });
    downloadCaregiverReportPdf(report);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const handleExportPng = () => {
    const report = buildCaregiverReadableReport({
      profile,
      settings,
      userId: user?.uid ?? "local",
    });
    downloadCaregiverReportPng(report);
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
  const pathIdForLessons = profile?.pathId ?? profile?.lipMode ?? 1;
  const canonLessonStage =
    profile?.currentLevel ?? profile?.currentStage ?? firstStageForMode(pathIdForLessons);
  const profileDisplayLessonLevel = pathLessonDisplayLevel(pathIdForLessons, canonLessonStage);

  const setup = [
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
      label: "Current lesson level",
      value: `Level ${profileDisplayLessonLevel}`,
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
    <div className="easeL-page-bg min-h-screen px-6 pb-16 pt-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="easeL-card p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: "var(--easeL-primary)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="easeL-heading-1 text-2xl">{displayName}</h1>
              {email && <p className="mt-1 truncate" style={{ color: "var(--easeL-text-muted)" }}>{email}</p>}
              <p className="text-sm mt-2" style={{ color: "var(--easeL-text-muted)" }}>
                This page is for caregiver reference. The child interacts with Home and Lessons.
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="easeL-heading-2 text-xl mb-4">Setup status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {setup.map((item) => (
              <div
                key={item.label}
                className="easeL-hoverable-card rounded-2xl px-5 py-4 border-2"
                style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--easeL-text-muted)" }}>{item.label}</p>
                <p className="text-base font-bold mt-1" style={{ color: "var(--easeL-text)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="easeL-heading-2 text-xl mb-4">Usage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {usage.map((item) => (
              <div
                key={item.label}
                className="easeL-hoverable-card rounded-2xl px-5 py-4 border-2"
                style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--easeL-text-muted)" }}>{item.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "var(--easeL-text)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {metricRows && (
          <section>
            <h2 className="easeL-heading-2 text-xl mb-4">Screener metrics</h2>
            <div className="easeL-card divide-y divide-slate-100 overflow-hidden">
              {metricRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3">
                  <p className="text-slate-700 font-medium">{row.label}</p>
                  <p className="font-mono text-slate-800">{row.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="easeL-card p-4 space-y-1">
          <Link
            to="/calibration"
            className="easeL-interactive flex items-center gap-3 rounded-2xl p-4 text-slate-700 hover:bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]"
          >
            <Target className="easeL-accent-text-strong h-5 w-5" />
            Re-run calibration
          </Link>
          <Link
            to="/screener"
            className="easeL-interactive flex items-center gap-3 rounded-2xl p-4 text-slate-700 hover:bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]"
          >
            <RefreshCcw className="easeL-accent-text-strong h-5 w-5" />
            Re-run screener
          </Link>
          <Link
            to="/settings"
            className="easeL-interactive flex items-center gap-3 rounded-2xl p-4 text-slate-700 hover:bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]"
          >
            <SettingsIcon className="easeL-accent-text-strong h-5 w-5" />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleExportPdf}
            className="group easeL-interactive flex w-full items-center gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--easeL-primary)_25%,white)] bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)] p-4 text-left text-[color:var(--easeL-primary)] shadow-sm hover:bg-[color-mix(in_srgb,var(--easeL-primary)_13%,white)] hover:shadow-md"
          >
            {exported ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <Download className="h-5 w-5 transition-transform group-hover:scale-110" />
            )}
            <div className="flex-1">
              <p className="font-medium">Export progress report (PDF)</p>
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
            onClick={handleExportPng}
            className="group easeL-interactive flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-700 shadow-sm hover:border-[color:color-mix(in_srgb,var(--easeL-primary)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--easeL-primary)_6%,white)] hover:shadow-md"
          >
            <Download className="easeL-accent-text-strong h-5 w-5 transition-transform group-hover:scale-110" />
            <div className="flex-1">
              <p className="font-medium">Export progress report (PNG)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Shareable one-page summary in readable language.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onSignOut?.();
              navigate("/");
            }}
            className="easeL-interactive flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-red-50 text-red-600 font-semibold text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
