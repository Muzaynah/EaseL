import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, LogOut, Target, RefreshCcw, Download, Check } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { getTrialLog, getSessionLog } from "../utils/persistence";
import { buildCaregiverReadableReport, downloadCaregiverReportPdf, downloadCaregiverReportPng } from "../utils/dataExport";
import { firstStageForMode, pathLessonDisplayLevel } from "../utils/lessonContent";

const MS_PER_HOUR = 1000 * 60 * 60;

const T = {
  en: {
    caregiverNote: "This page is for caregiver reference. The child interacts with Home and Lessons.",
    setupStatus: "Setup status",
    calibration: "Calibration",
    tutorial: "Tutorial",
    completed: "Completed",
    notCompleted: "Not completed",
    pathAssignment: "Path assignment",
    notAssigned: "Not assigned",
    useCategory: "Use category",
    independent: "Independent use",
    assisted: "Assisted use",
    currentLevel: "Current lesson level",
    level: "Level",
    usage: "Usage",
    sessionsLogged: "Sessions logged",
    trialAttempts: "Trial attempts",
    successfulAttempts: "Successful attempts",
    practiceTime: "Practice time",
    screenerMetrics: "Screener metrics",
    reCalibration: "Re-run calibration",
    reScreener: "Re-run screener",
    settings: "Settings",
    exportPdf: "Export progress report (PDF)",
    exportPdfSub: "Only derived metrics — no video, no biometric templates.",
    exportPng: "Export progress report (PNG)",
    exportPngSub: "Shareable one-page summary.",
    downloaded: "Downloaded",
    signOut: "Sign out",
    path: "Path",
  },
  ur: {
    caregiverNote: "یہ صفحہ نگہبان کے لیے ہے۔ بچہ Home اور Lessons استعمال کرتا ہے۔",
    setupStatus: "سیٹ اپ کی حالت",
    calibration: "Calibration",
    tutorial: "Tutorial",
    completed: "مکمل",
    notCompleted: "نامکمل",
    pathAssignment: "راستہ",
    notAssigned: "نہیں دیا گیا",
    useCategory: "استعمال کی قسم",
    independent: "خود استعمال",
    assisted: "مدد سے استعمال",
    currentLevel: "موجودہ سبق کی سطح",
    level: "سطح",
    usage: "استعمال",
    sessionsLogged: "سیشن",
    trialAttempts: "کل کوششیں",
    successfulAttempts: "کامیاب کوششیں",
    practiceTime: "مشق کا وقت",
    screenerMetrics: "Screener نتائج",
    reCalibration: "Calibration دوبارہ کریں",
    reScreener: "Screener دوبارہ کریں",
    settings: "Settings",
    exportPdf: "ترقی رپورٹ ڈاؤن لوڈ کریں (PDF)",
    exportPdfSub: "صرف derived metrics — کوئی ویڈیو یا biometric نہیں۔",
    exportPng: "ترقی رپورٹ ڈاؤن لوڈ کریں (PNG)",
    exportPngSub: "ایک صفحہ کا خلاصہ۔",
    downloaded: "ڈاؤن لوڈ ہو گیا",
    signOut: "لاگ آؤٹ",
    path: "راستہ",
  },
};

function t(lang, key) { return T[lang]?.[key] ?? T.en[key] ?? key; }

function formatDate(ms, lang = "en") {
  if (!ms) return "—";
  const d = new Date(ms);
  if (lang === "ur") return d.toLocaleDateString("ur-PK", { month: "short", day: "numeric", year: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Profile({ user, onSignOut }) {
  const navigate = useNavigate();
  const { profile, settings } = useAppState();
  const [exported, setExported] = useState(false);
  const lang = profile?.caregiverReported?.language ?? "en";
  const ur = lang === "ur";

  const handleExportPdf = () => {
    const report = buildCaregiverReadableReport({ profile, settings, userId: user?.uid ?? "local" });
    downloadCaregiverReportPdf(report);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const handleExportPng = () => {
    const report = buildCaregiverReadableReport({ profile, settings, userId: user?.uid ?? "local" });
    downloadCaregiverReportPng(report);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const displayName = user?.name ?? profile?.name ?? "User";
  const email = user?.email ?? "";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const trialLog = typeof window !== "undefined" ? getTrialLog() : [];
  const sessionLog = typeof window !== "undefined" ? getSessionLog() : [];
  const attempts = trialLog.length;
  const successes = trialLog.filter((t) => t.success).length;
  const totalSessions = sessionLog.length;
  const totalPracticeMs = sessionLog.reduce((a, s) => a + (s.durationMs || 0), 0);
  const practiceHours = (totalPracticeMs / MS_PER_HOUR).toFixed(1);
  const pathIdForLessons = profile?.pathId ?? profile?.lipMode ?? 1;
  const canonLessonStage = profile?.currentLevel ?? profile?.currentStage ?? firstStageForMode(pathIdForLessons);
  const profileDisplayLessonLevel = pathLessonDisplayLevel(pathIdForLessons, canonLessonStage);

  const pathValue = (profile?.pathId ?? profile?.lipMode)
    ? `${t(lang, "path")} ${profile?.pathId ?? profile?.lipMode}`
    : t(lang, "notAssigned");

  const tutorialValue = profile?.tutorialPassed ? t(lang, "completed") : t(lang, "notCompleted");
  const useCategoryValue = profile?.independentUse == null ? "—"
    : profile.independentUse ? t(lang, "independent") : t(lang, "assisted");

  const setup = [
    { label: t(lang, "calibration"), value: formatDate(profile?.calibration?.lastCalibratedAt, lang) },
    { label: t(lang, "tutorial"),    value: tutorialValue },
    { label: t(lang, "pathAssignment"), value: pathValue },
    { label: t(lang, "useCategory"), value: useCategoryValue },
    { label: t(lang, "currentLevel"), value: `${t(lang, "level")} ${profileDisplayLessonLevel}` },
  ];

  const usage = [
    { label: t(lang, "sessionsLogged"),     value: `${totalSessions}` },
    { label: t(lang, "trialAttempts"),       value: `${attempts}` },
    { label: t(lang, "successfulAttempts"),  value: `${successes}` },
    { label: t(lang, "practiceTime"),        value: `${practiceHours} h` },
  ];

  const m = profile?.screenerMetrics || null;
  const metricRows = m ? [
    { label: "S1 · Reaction", value: m.s1ReactionMs != null ? `${Math.round(m.s1ReactionMs)} ms` : "—" },
    { label: "S2 · Hold",     value: m.s2HoldMs != null ? `${Math.round(m.s2HoldMs)} ms` : "—" },
    { label: "S3 · Activation", value: m.s3Hits != null && m.s3Total ? `${m.s3Hits} / ${m.s3Total}` : "—" },
    { label: "S4 · Corridor", value: m.s4TimeMs != null ? `${Math.round(m.s4TimeMs)} ms · ${m.s4Deviations ?? 0} dev` : "—" },
    { label: "S5 · Fatigue",  value: m.s5Round1Ms && m.s5Round2Ms ? `${(m.s5Round2Ms / m.s5Round1Ms).toFixed(2)}×` : "—" },
  ] : null;

  return (
    <div className="easeL-page-bg min-h-screen px-4 pb-16 easeL-page-top sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* User card */}
        <div className="easeL-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: "var(--easeL-primary)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="easeL-heading-1 text-2xl">{displayName}</h1>
              {email && <p className="mt-1 truncate" style={{ color: "var(--easeL-text-muted)" }}>{email}</p>}
              <p className={`text-sm mt-2 ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                {t(lang, "caregiverNote")}
              </p>
            </div>
          </div>
        </div>

        {/* Setup status */}
        <section>
          <h2 className={`easeL-heading-2 text-xl mb-4 ${ur ? "ur" : ""}`}>{t(lang, "setupStatus")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {setup.map((item) => (
              <div key={item.label} className="easeL-hoverable-card rounded-2xl px-5 py-4 border-2"
                style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}>
                <p className={`text-xs uppercase tracking-wide ${ur ? "ur normal-case text-[11px]" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>{item.label}</p>
                <p className={`text-base font-bold mt-1 ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Usage */}
        <section>
          <h2 className={`easeL-heading-2 text-xl mb-4 ${ur ? "ur" : ""}`}>{t(lang, "usage")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {usage.map((item) => (
              <div key={item.label} className="easeL-hoverable-card rounded-2xl px-5 py-4 border-2"
                style={{ background: "var(--easeL-bg-section)", borderColor: "var(--easeL-border-strong)" }}>
                <p className={`text-xs uppercase tracking-wide ${ur ? "ur normal-case text-[11px]" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>{item.label}</p>
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: "var(--easeL-text)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Screener metrics */}
        {metricRows && (
          <section>
            <h2 className={`easeL-heading-2 text-xl mb-4 ${ur ? "ur" : ""}`}>{t(lang, "screenerMetrics")}</h2>
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

        {/* Actions */}
        <div className="easeL-card p-4 space-y-1">
          <Link to="/calibration"
            className="easeL-interactive flex items-center gap-3 rounded-2xl p-4 text-slate-700 hover:bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]">
            <Target className="easeL-accent-text-strong h-5 w-5 shrink-0" />
            <span className={ur ? "ur" : ""}>{t(lang, "reCalibration")}</span>
          </Link>
          <Link to="/screener"
            className="easeL-interactive flex items-center gap-3 rounded-2xl p-4 text-slate-700 hover:bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]">
            <RefreshCcw className="easeL-accent-text-strong h-5 w-5 shrink-0" />
            <span className={ur ? "ur" : ""}>{t(lang, "reScreener")}</span>
          </Link>
          <Link to="/settings"
            className="easeL-interactive flex items-center gap-3 rounded-2xl p-4 text-slate-700 hover:bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]">
            <SettingsIcon className="easeL-accent-text-strong h-5 w-5 shrink-0" />
            <span className={ur ? "ur" : ""}>{t(lang, "settings")}</span>
          </Link>
          <button type="button" onClick={handleExportPdf}
            className="group easeL-interactive flex w-full items-center gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--easeL-primary)_25%,white)] bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)] p-4 text-left text-[color:var(--easeL-primary)] shadow-sm hover:bg-[color-mix(in_srgb,var(--easeL-primary)_13%,white)]">
            {exported ? <Check className="w-5 h-5 text-emerald-600 shrink-0" /> : <Download className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />}
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${ur ? "ur" : ""}`}>{t(lang, "exportPdf")}</p>
              <p className={`text-xs text-slate-500 mt-0.5 ${ur ? "ur" : ""}`}>{t(lang, "exportPdfSub")}</p>
            </div>
            {exported && <span className={`text-emerald-600 text-sm font-medium ${ur ? "ur" : ""}`}>{t(lang, "downloaded")}</span>}
          </button>
          <button type="button" onClick={handleExportPng}
            className="group easeL-interactive flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-700 shadow-sm hover:border-[color:color-mix(in_srgb,var(--easeL-primary)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--easeL-primary)_6%,white)]">
            <Download className="easeL-accent-text-strong h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${ur ? "ur" : ""}`}>{t(lang, "exportPng")}</p>
              <p className={`text-xs text-slate-500 mt-0.5 ${ur ? "ur" : ""}`}>{t(lang, "exportPngSub")}</p>
            </div>
          </button>
          <button type="button"
            onClick={() => { onSignOut?.(); navigate("/"); }}
            className="easeL-interactive flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-red-50 text-red-600 font-semibold text-left">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={ur ? "ur" : ""}>{t(lang, "signOut")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
