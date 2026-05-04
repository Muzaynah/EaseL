import { useMemo, useState, createElement } from "react";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Download,
  TrendingUp,
  Activity,
  Timer,
  AlertTriangle,
  X,
  Target,
  Flame,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getTrialLog,
  getSessionLog,
  getSettings,
  getTelemetryLog,
  getCloudLogState,
} from "../utils/persistence";
import {
  computeStageLadder,
  summariseSessions,
  recentAdherences,
  recentJitter,
  computeFatigueIndex,
} from "../utils/stageAdaptation";
import {
  buildCaregiverReadableReport,
  downloadCaregiverReportPdf,
  downloadCaregiverReportPng,
} from "../utils/dataExport";
import { UI_TOKENS } from "../theme/uiTokens";
import { pathLessonDisplayLevel } from "../utils/lessonContent";

const MS_PER_HOUR = 1000 * 60 * 60;

// ─── i18n helpers ────────────────────────────────────────────────────────────
const T = {
  en: {
    dashboard: "Caregiver dashboard",
    overview: "Progress overview",
    overviewSub: "A summary of recent practice — attempts, accuracy, and fatigue. Not a clinical report.",
    previewBtn: "Preview & Download Report",
    sessions: "Sessions",
    attempts: "Attempts",
    practiceTime: "Practice time",
    avgAdherence: "Avg accuracy",
    startsOf5: "Starts (last 5)",
    retriesPerLevel: "Retries / level",
    activityCalendar: "Activity calendar",
    activitySub: "Each square is one day. Colour shows average accuracy for that day.",
    levelLadder: "Level progress",
    levelLadderSub: "Mastery builds over multiple strong attempts. The app adjusts support automatically.",
    level: "Level",
    path: "Path",
    attempts2: "attempts",
    passRate: "Pass rate",
    recentAccuracy: "Recent accuracy",
    recentAccSub: "Last 20 attempts — higher is better",
    cursorJitter: "Cursor steadiness",
    cursorJitterSub: "Last 20 attempts — higher means steadier",
    recentSessions: "Recent sessions",
    recentSessionsSub: "Accuracy and fatigue index per session.",
    noSessions: "No sessions recorded yet.",
    date: "Date",
    pathLevel: "Path · level",
    duration: "Duration",
    avgAcc: "Avg accuracy",
    fatigue: "Fatigue",
    fatigueLow: "Low",
    fatigueMod: "Moderate",
    fatigueHigh: "High",
    fatigueAlert: "Fatigue noted — shorter sessions suggested",
    disclaimer: "EaseL stores only derived performance metrics. No raw video, audio, or biometric templates are recorded or exported. This is a caregiver reference, not a clinical assessment.",
    reportPreview: "Report preview",
    reportTitle: "EaseL Progress Report",
    child: "Child",
    avgAdh: "Average accuracy",
    trend: "Trend",
    masteredLevels: "Mastered levels",
    needsSupport: "Needs support",
    summary: "Summary",
    strengths: "Strengths",
    supportFocus: "Support focus",
    recommendations: "Recommendations",
    download: "Download",
    loadingCloud: "Loading progress data...",
    permissionDenied: "Permission denied",
    permissionDeniedSub: "Could not read cloud progress logs for this account.",
    networkError: "Network error",
    networkErrorSub: "Could not fetch cloud progress logs. Please retry after reconnecting.",
    retry: "Retry",
    noData: "Not enough data yet.",
    mon: "Mon", wed: "Wed", fri: "Fri",
    jan:"Jan",feb:"Feb",mar:"Mar",apr:"Apr",may:"May",jun:"Jun",
    jul:"Jul",aug:"Aug",sep:"Sep",oct:"Oct",nov:"Nov",dec:"Dec",
  },
  ur: {
    dashboard: "نگہبان ڈیش بورڈ",
    overview: "ترقی کا جائزہ",
    overviewSub: "حالیہ مشق کا خلاصہ — کوششیں، درستگی، اور تھکاوٹ۔ یہ طبی رپورٹ نہیں ہے۔",
    previewBtn: "رپورٹ دیکھیں اور ڈاؤن لوڈ کریں",
    sessions: "سیشن",
    attempts: "کوششیں",
    practiceTime: "مشق کا وقت",
    avgAdherence: "اوسط درستگی",
    startsOf5: "شروعات (آخری 5)",
    retriesPerLevel: "دوبارہ کوشش / سطح",
    activityCalendar: "سرگرمی کیلنڈر",
    activitySub: "ہر خانہ ایک دن ہے۔ رنگ اس دن کی اوسط درستگی دکھاتا ہے۔",
    levelLadder: "سطح کی ترقی",
    levelLadderSub: "مہارت کئی کامیاب کوششوں سے بنتی ہے۔ App خود مدد کو ایڈجسٹ کرتا ہے۔",
    level: "سطح",
    path: "راستہ",
    attempts2: "کوششیں",
    passRate: "پاس کی شرح",
    recentAccuracy: "حالیہ درستگی",
    recentAccSub: "آخری 20 کوششیں — زیادہ بہتر ہے",
    cursorJitter: "cursor کی سکون",
    cursorJitterSub: "آخری 20 کوششیں — زیادہ بہتر ہے",
    recentSessions: "حالیہ سیشن",
    recentSessionsSub: "ہر سیشن میں درستگی اور تھکاوٹ۔",
    noSessions: "ابھی کوئی سیشن نہیں۔",
    date: "تاریخ",
    pathLevel: "راستہ · سطح",
    duration: "وقت",
    avgAcc: "اوسط درستگی",
    fatigue: "تھکاوٹ",
    fatigueLow: "کم",
    fatigueMod: "درمیانی",
    fatigueHigh: "زیادہ",
    fatigueAlert: "تھکاوٹ نظر آئی — چھوٹے سیشن بہتر ہیں",
    disclaimer: "EaseL صرف derived metrics محفوظ کرتا ہے۔ کوئی ویڈیو، آڈیو، یا biometric template محفوظ یا export نہیں ہوتا۔ یہ نگہبان کے لیے حوالہ ہے، طبی تشخیص نہیں۔",
    reportPreview: "رپورٹ preview",
    reportTitle: "EaseL ترقی رپورٹ",
    child: "بچہ",
    avgAdh: "اوسط درستگی",
    trend: "رجحان",
    masteredLevels: "مہارت کی سطحیں",
    needsSupport: "مدد درکار",
    summary: "خلاصہ",
    strengths: "خوبیاں",
    supportFocus: "مدد کا محور",
    recommendations: "تجاویز",
    download: "ڈاؤن لوڈ",
    loadingCloud: "ڈیٹا لوڈ ہو رہا ہے...",
    permissionDenied: "اجازت نہیں",
    permissionDeniedSub: "اس account کے cloud logs نہیں کھل سکے۔",
    networkError: "نیٹ ورک خرابی",
    networkErrorSub: "Cloud logs نہیں مل سکے۔ دوبارہ کوشش کریں۔",
    retry: "دوبارہ کوشش",
    noData: "ابھی کافی ڈیٹا نہیں۔",
    mon: "پیر", wed: "بدھ", fri: "جمعہ",
    jan:"جن",feb:"فر",mar:"مار",apr:"اپر",may:"مئی",jun:"جون",
    jul:"جول",aug:"اگ",sep:"ستم",oct:"اکت",nov:"نو",dec:"دس",
  },
};

function t(lang, key) { return T[lang]?.[key] ?? T.en[key] ?? key; }

function formatDate(ms, lang = "en") {
  if (!ms) return "—";
  const d = new Date(ms);
  if (lang === "ur") {
    return d.toLocaleDateString("ur-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms, lang = "en") {
  if (!ms || ms < 1000) return "—";
  const mins = Math.round(ms / 60000);
  if (lang === "ur") {
    if (mins < 60) return `${mins} منٹ`;
    const hrs = Math.floor(mins / 60);
    const r = mins % 60;
    return r ? `${hrs} گھنٹہ ${r} منٹ` : `${hrs} گھنٹہ`;
  }
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${hrs}h ${r}m` : `${hrs}h`;
}

// ─── Calendar heatmap helpers ─────────────────────────────────────────────────
function buildCalendarData(trialLog) {
  // Group trials by UTC date string (YYYY-MM-DD)
  const byDay = {};
  for (const trial of trialLog) {
    if (!trial.timestamp) continue;
    const key = new Date(trial.timestamp).toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { total: 0, sumAdh: 0 };
    byDay[key].total++;
    byDay[key].sumAdh += (trial.adherence ?? 0);
  }
  // avg adherence per day
  const result = {};
  for (const [key, v] of Object.entries(byDay)) {
    result[key] = { total: v.total, avg: Math.round(v.sumAdh / v.total) };
  }
  return result;
}

function CalendarHeatmap({ trialLog, lang }) {
  const calData = useMemo(() => buildCalendarData(trialLog), [trialLog]);

  // Build last 15 weeks (105 days), starting from most recent Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // go back to Sunday
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - startDay.getDay() - 14 * 7);

  const WEEKS = 15;
  const weeks = [];
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10);
      week.push({ date, key, data: calData[key] ?? null });
    }
    weeks.push(week);
  }

  // Month labels — find first day of each month appearing in our grid
  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ wi, m });
      lastMonth = m;
    }
  });

  const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const DAY_LABELS_EN = ["", "Mon", "", "Wed", "", "Fri", ""];
  const DAY_LABELS_UR = ["", "پیر", "", "بدھ", "", "جمعہ", ""];
  const dayLabels = lang === "ur" ? DAY_LABELS_UR : DAY_LABELS_EN;

  function cellColor(data) {
    if (!data) return "var(--easeL-border-subtle)";
    const a = data.avg;
    if (a >= 80) return "#22c55e";   // green-500
    if (a >= 60) return "#86efac";   // green-300
    if (a >= 40) return "#fbbf24";   // amber-400
    if (a >= 20) return "#f97316";   // orange-500
    return "#ef4444";                // red-500
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-0.5 min-w-max">
        {/* Month labels row */}
        <div className="flex gap-0.5 mb-1 pl-6">
          {weeks.map((_, wi) => {
            const ml = monthLabels.find(x => x.wi === wi);
            return (
              <div key={wi} className="w-[13px] text-[9px] font-semibold overflow-visible whitespace-nowrap"
                style={{ color: "var(--easeL-text-muted)" }}>
                {ml ? t(lang, MONTH_KEYS[ml.m]) : ""}
              </div>
            );
          })}
        </div>
        {/* Day rows */}
        {[0,1,2,3,4,5,6].map(d => (
          <div key={d} className="flex items-center gap-0.5">
            <div className="w-5 text-[9px] font-medium text-right pr-1 shrink-0"
              style={{ color: "var(--easeL-text-muted)" }}>
              {dayLabels[d]}
            </div>
            {weeks.map((week, wi) => {
              const cell = week[d];
              const isFuture = cell.date > today;
              return (
                <div
                  key={wi}
                  title={cell.data ? `${cell.key}: ${cell.data.total} ${lang === "ur" ? "کوششیں" : "attempts"}, ${cell.data.avg}%` : cell.key}
                  className="w-[13px] h-[13px] rounded-[2px] shrink-0"
                  style={{
                    background: isFuture ? "transparent" : cellColor(cell.data),
                    opacity: isFuture ? 0 : cell.data ? 1 : 0.35,
                  }}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className={`flex items-center gap-2 mt-2 pl-6 text-[10px] font-medium ${lang === "ur" ? "ur flex-row-reverse" : ""}`}
          style={{ color: "var(--easeL-text-muted)" }}>
          <span>{lang === "ur" ? "کم" : "Low"}</span>
          {["#ef4444","#f97316","#fbbf24","#86efac","#22c55e"].map(c => (
            <div key={c} className="w-[13px] h-[13px] rounded-[2px]" style={{ background: c }} />
          ))}
          <span>{lang === "ur" ? "اعلی" : "High"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CaregiverProgress() {
  const { user, profile } = useAuth();
  const lang = profile?.caregiverReported?.language ?? "en";
  const ur = lang === "ur";
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState("pdf");

  const data = useMemo(() => {
    const trialLog = getTrialLog();
    const sessionLog = getSessionLog();
    const userId = user?.uid ?? "local";
    return {
      trialLog,
      sessionLog,
      telemetryLog: getTelemetryLog(),
      ladder: computeStageLadder(trialLog, userId),
      sessions: summariseSessions(trialLog, sessionLog),
      adherenceSpark: recentAdherences(trialLog, 20),
      jitterSpark: recentJitter(trialLog, 20),
    };
  }, [user?.uid]);

  const totalPracticeMs = data.sessionLog.reduce((a, s) => a + (s.durationMs || 0), 0);
  const totalAttempts = data.trialLog.length;
  const activationEvents = data.telemetryLog.filter((e) => e.event === "stroke-start");
  const lastFiveStarts = activationEvents.slice(-5);
  const successfulStarts = lastFiveStarts.length;
  const retriesPerStage = data.ladder.length > 0
    ? Math.round(data.ladder.reduce((a, s) => a + (s.attempts || 0), 0) / Math.max(1, data.ladder.length))
    : 0;
  const recentFatigue = data.sessions.length
    ? data.sessions[0].fatigueIndex
    : computeFatigueIndex(data.trialLog.slice(-10));

  const avgAdherence = data.adherenceSpark.length > 0
    ? Math.round(data.adherenceSpark.reduce((a, b) => a + b, 0) / data.adherenceSpark.length)
    : null;

  const generateReport = () => {
    const settings = getSettings();
    const next = buildCaregiverReadableReport({ profile, settings, userId: user?.uid ?? "local" });
    setReportData(next);
    return next;
  };

  const openReportPreview = () => {
    const next = generateReport();
    if (next) setPreviewOpen(true);
  };

  const handleDownloadFromPreview = () => {
    if (!reportData) return;
    if (downloadFormat === "png") { downloadCaregiverReportPng(reportData); return; }
    downloadCaregiverReportPdf(reportData);
  };

  const cloudLogState = getCloudLogState();

  if (cloudLogState === "loading") {
    return (
      <div className="easeL-page-bg flex min-h-screen items-center justify-center easeL-page-top">
        <div className="easeL-auth-card p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--easeL-primary)]" />
          <p className={`font-semibold text-slate-700 ${ur ? "ur" : ""}`}>{t(lang, "loadingCloud")}</p>
        </div>
      </div>
    );
  }

  if (cloudLogState === "denied") {
    return (
      <div className="easeL-page-bg flex min-h-screen items-center justify-center px-6 easeL-page-top">
        <div className="max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
          <h2 className={`text-2xl font-bold text-slate-800 ${ur ? "ur" : ""}`}>{t(lang, "permissionDenied")}</h2>
          <p className={`mt-2 text-slate-600 ${ur ? "ur" : ""}`}>{t(lang, "permissionDeniedSub")}</p>
          <button type="button" onClick={() => window.location.reload()} className="easeL-btn-outline mt-4 w-auto px-5">
            <span className={ur ? "ur" : ""}>{t(lang, "retry")}</span>
          </button>
        </div>
      </div>
    );
  }

  if (cloudLogState === "network") {
    return (
      <div className="easeL-page-bg flex min-h-screen items-center justify-center px-6 easeL-page-top">
        <div className="max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
          <h2 className={`text-2xl font-bold text-slate-800 ${ur ? "ur" : ""}`}>{t(lang, "networkError")}</h2>
          <p className={`mt-2 text-slate-600 ${ur ? "ur" : ""}`}>{t(lang, "networkErrorSub")}</p>
          <button type="button" onClick={() => window.location.reload()} className="easeL-btn-outline mt-4 w-auto px-5">
            <span className={ur ? "ur" : ""}>{t(lang, "retry")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="easeL-page-bg min-h-screen px-4 pb-16 easeL-page-top sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className={`easeL-accent-text-strong text-sm font-semibold tracking-wider ${ur ? "ur" : ""}`}>
              {t(lang, "dashboard")}
            </p>
            <h1 className={`easeL-heading-1 mt-1 ${ur ? "ur" : ""}`}>{t(lang, "overview")}</h1>
            <p className={`easeL-text-muted mt-1 max-w-2xl ${ur ? "ur" : ""}`}>{t(lang, "overviewSub")}</p>
          </div>
          <button
            type="button"
            onClick={openReportPreview}
            className="easeL-interactive inline-flex items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--easeL-primary)_28%,white)] bg-[color-mix(in_srgb,var(--easeL-primary)_10%,white)] px-5 py-3 font-semibold text-[color:var(--easeL-primary)] shadow-sm hover:bg-[color-mix(in_srgb,var(--easeL-primary)_16%,white)] hover:shadow-md whitespace-nowrap"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className={ur ? "ur" : ""}>{t(lang, "previewBtn")}</span>
          </button>
        </header>

        {/* ── Summary tiles ── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: BookOpen,      key: "sessions",       value: data.sessionLog.length },
            { icon: Activity,      key: "attempts",       value: totalAttempts },
            { icon: Timer,         key: "practiceTime",   value: totalPracticeMs > 0 ? formatDuration(totalPracticeMs, lang) : "—" },
            { icon: TrendingUp,    key: "avgAdherence",   value: avgAdherence != null ? `${avgAdherence}%` : "—" },
            { icon: Target,        key: "startsOf5",      value: `${successfulStarts}/5` },
            { icon: Flame,         key: "retriesPerLevel",value: retriesPerStage },
          ].map(({ icon, key, value }) => (
            <SummaryTile key={key} icon={icon} label={t(lang, key)} value={value} ur={ur} />
          ))}
        </section>

        {/* ── Activity calendar ── */}
        <section className="easeL-card p-5 sm:p-6">
          <h2 className={`easeL-heading-2 mb-1 ${ur ? "ur" : ""}`}>{t(lang, "activityCalendar")}</h2>
          <p className={`text-sm mb-4 ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>{t(lang, "activitySub")}</p>
          {data.trialLog.length === 0
            ? <p className={`text-sm ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>{t(lang, "noData")}</p>
            : <CalendarHeatmap trialLog={data.trialLog} lang={lang} />
          }
        </section>

        {/* ── Sparklines ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SparkCard
            title={t(lang, "recentAccuracy")}
            subtitle={t(lang, "recentAccSub")}
            values={data.adherenceSpark}
            scale={100}
            color={UI_TOKENS.lesson.tracePrimaryDark}
            noDataText={t(lang, "noData")}
            ur={ur}
          />
          <SparkCard
            title={t(lang, "cursorJitter")}
            subtitle={t(lang, "cursorJitterSub")}
            values={data.jitterSpark.map(v => 1 - Math.min(1, v / Math.max(0.05, Math.max(...data.jitterSpark, 0.05))))}
            scale={1}
            color={UI_TOKENS.lesson.success ?? "#22b892"}
            noDataText={t(lang, "noData")}
            ur={ur}
          />
        </section>

        {/* ── Level ladder ── */}
        <section className="easeL-card p-5 sm:p-6">
          <h2 className={`easeL-heading-2 mb-1 ${ur ? "ur" : ""}`}>{t(lang, "levelLadder")}</h2>
          <p className={`text-sm mb-5 ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>{t(lang, "levelLadderSub")}</p>
          <div className="space-y-2">
            {data.ladder.map((row) => {
              const mastered = row.status === "advance";
              const onThisStage = (profile?.currentLevel ?? profile?.currentStage ?? 0) === row.stage;
              const passRatePct = row.attempts > 0 ? Math.round(row.passRate * 100) : null;
              return (
                <div
                  key={row.stage}
                  className={`flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border-2 transition-colors ${
                    onThisStage
                      ? "border-[color:color-mix(in_srgb,var(--easeL-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]"
                      : mastered
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {mastered
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      : <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className={`font-bold text-slate-800 truncate ${ur ? "ur" : ""}`}>
                        {t(lang, "level")} {pathLessonDisplayLevel(row.mode, row.stage)} · {row.title}
                      </p>
                      <p className={`text-xs text-slate-500 ${ur ? "ur" : ""}`}>
                        {t(lang, "path")} {row.mode} · {row.attempts} {t(lang, "attempts2")}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs text-slate-500 ${ur ? "ur" : ""}`}>{t(lang, "passRate")}</p>
                    {passRatePct != null ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden bg-slate-200">
                          <div className="h-full rounded-full" style={{
                            width: `${passRatePct}%`,
                            background: mastered ? "#22c55e" : "var(--easeL-primary)"
                          }} />
                        </div>
                        <span className="font-bold text-slate-800 text-sm tabular-nums">{passRatePct}%</span>
                      </div>
                    ) : (
                      <p className="font-bold text-slate-400">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Sessions table ── */}
        <section className="easeL-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h2 className={`easeL-heading-2 ${ur ? "ur" : ""}`}>{t(lang, "recentSessions")}</h2>
              <p className={`text-sm ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>{t(lang, "recentSessionsSub")}</p>
            </div>
            {recentFatigue > 0.4 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold ${ur ? "ur" : ""}`}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {t(lang, "fatigueAlert")}
              </div>
            )}
          </div>
          {data.sessions.length === 0 ? (
            <p className={`text-slate-500 text-sm ${ur ? "ur" : ""}`}>{t(lang, "noSessions")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b border-slate-200 text-slate-500 ${ur ? "ur text-right" : "text-left"}`}>
                    <th className="py-2 font-semibold">{t(lang, "date")}</th>
                    <th className="py-2 font-semibold">{t(lang, "pathLevel")}</th>
                    <th className="py-2 font-semibold">{t(lang, "duration")}</th>
                    <th className="py-2 font-semibold">{t(lang, "attempts")}</th>
                    <th className="py-2 font-semibold">{t(lang, "avgAcc")}</th>
                    <th className="py-2 font-semibold">{t(lang, "fatigue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.slice(0, 10).map((s, idx) => (
                    <tr key={`${s.timestamp}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className={`py-3 text-slate-700 ${ur ? "ur" : ""}`}>{formatDate(s.timestamp, lang)}</td>
                      <td className={`py-3 text-slate-700 ${ur ? "ur" : ""}`}>
                        {s.mode ? `${t(lang,"path")} ${s.mode}` : "—"}
                        {s.stage != null && s.mode ? ` · ${t(lang,"level")} ${pathLessonDisplayLevel(s.mode, s.stage)}` : ""}
                      </td>
                      <td className={`py-3 text-slate-700 ${ur ? "ur" : ""}`}>{formatDuration(s.durationMs, lang)}</td>
                      <td className="py-3 text-slate-700 tabular-nums">{s.attempts}</td>
                      <td className="py-3 text-slate-700 tabular-nums">
                        {s.avgAdherence != null ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full" style={{
                              background: s.avgAdherence >= 70 ? "#22c55e" : s.avgAdherence >= 45 ? "#fbbf24" : "#ef4444"
                            }} />
                            {Math.round(s.avgAdherence)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3"><FatiguePill value={s.fatigueIndex} lang={lang} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Disclaimer ── */}
        <section className="rounded-3xl p-4 border-2 text-xs"
          style={{ background: "var(--easeL-bg-card-butter)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text-muted)" }}>
          <p className={ur ? "ur" : ""}>{t(lang, "disclaimer")}</p>
        </section>
      </div>

      {/* ── Report preview modal ── */}
      {previewOpen && reportData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
          <div className="relative max-h-[88vh] w-full max-w-4xl overflow-auto rounded-3xl border border-white/60 bg-white p-6 shadow-2xl md:p-8">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <p className={`text-sm font-semibold uppercase tracking-wide easeL-accent-text-strong ${ur ? "ur" : ""}`}>{t(lang, "reportPreview")}</p>
            <h2 className={`mt-1 text-2xl font-bold text-slate-800 ${ur ? "ur" : ""}`}>{t(lang, "reportTitle")}</h2>
            <p className={`mt-1 text-sm text-slate-500 ${ur ? "ur" : ""}`}>
              {t(lang, "child")}: {reportData.childName} · Path {reportData.pathId} · {t(lang,"level")} {reportData.pathLevel}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              <PreviewStat label={t(lang, "sessions")} value={reportData.summary.sessions} ur={ur} />
              <PreviewStat label={t(lang, "attempts")} value={reportData.summary.attempts} ur={ur} />
              <PreviewStat label={t(lang, "avgAdh")} value={reportData.summary.avgAdherence != null ? `${reportData.summary.avgAdherence}%` : "—"} ur={ur} />
              <PreviewStat label={t(lang, "trend")} value={reportData.summary.adherenceTrend} ur={ur} />
              <PreviewStat label={t(lang, "masteredLevels")} value={reportData.summary.levelsMastered} ur={ur} />
              <PreviewStat label={t(lang, "needsSupport")} value={reportData.summary.levelsNeedingSupport} ur={ur} />
            </div>

            <PreviewList title={t(lang, "summary")} items={reportData.narrative} ur={ur} />
            <PreviewList title={t(lang, "strengths")} items={reportData.strengths} ur={ur} />
            <PreviewList title={t(lang, "supportFocus")} items={reportData.supportsNeeded} ur={ur} />
            <PreviewList title={t(lang, "recommendations")} items={reportData.recommendations} ur={ur} />

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
              <p className={`text-xs font-semibold uppercase tracking-wide text-slate-500 ${ur ? "ur" : ""}`}>{t(lang, "download")}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none">
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="png">Image (.png)</option>
                </select>
                <button type="button" onClick={handleDownloadFromPreview}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[color:var(--easeL-primary)] px-5 font-semibold text-white hover:opacity-95">
                  <Download className="h-4 w-4" />
                  <span className={ur ? "ur" : ""}>{t(lang, "download")}</span>
                </button>
              </div>
            </div>

            <p className={`mt-4 text-xs text-slate-500 ${ur ? "ur" : ""}`}>{reportData.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewStat({ label, value, ur }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className={`text-xs uppercase tracking-wide text-slate-500 ${ur ? "ur" : ""}`}>{label}</p>
      <p className={`mt-1 text-lg font-bold text-slate-800 ${ur ? "ur" : ""}`}>{value}</p>
    </div>
  );
}

function PreviewList({ title, items, ur }) {
  if (!items?.length) return null;
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <h3 className={`text-sm font-bold uppercase tracking-wide text-slate-600 ${ur ? "ur" : ""}`}>{title}</h3>
      <div className="mt-2 space-y-1.5">
        {items.map((item, idx) => (
          <p key={idx} className={`text-sm text-slate-700 ${ur ? "ur" : ""}`}>• {item}</p>
        ))}
      </div>
    </section>
  );
}

function SummaryTile({ icon: Icon, label, value, ur }) {
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow border border-white/60 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "color-mix(in srgb, var(--easeL-primary) 14%, white)" }}>
        {createElement(Icon, { className: "easeL-accent-text-strong h-5 w-5" })}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] text-slate-500 uppercase tracking-wide leading-tight ${ur ? "ur text-[11px] normal-case" : ""}`}>{label}</p>
        <p className="font-bold text-slate-800 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function SparkCard({ title, subtitle, values, scale, color, noDataText, ur }) {
  const hasData = values.length > 0;
  const width = 260; const height = 60;
  const max = scale || 1;
  const points = hasData
    ? values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * width;
        const y = height - 3 - Math.min(1, Math.max(0, v / max)) * (height - 6);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ")
    : "";

  // Color dots at each data point
  const dots = hasData ? values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - 3 - Math.min(1, Math.max(0, v / max)) * (height - 6);
    return { x, y };
  }) : [];

  return (
    <div className="bg-white/90 backdrop-blur rounded-3xl p-5 shadow-lg border border-white/60">
      <h3 className={`font-bold text-slate-800 ${ur ? "ur" : ""}`}>{title}</h3>
      <p className={`text-xs text-slate-500 mb-3 ${ur ? "ur" : ""}`}>{subtitle}</p>
      {hasData ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14" preserveAspectRatio="none">
          <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} opacity="0.5" />
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={3} fill={color} />
          ))}
        </svg>
      ) : (
        <p className={`text-slate-400 text-sm ${ur ? "ur" : ""}`}>{noDataText}</p>
      )}
    </div>
  );
}

function FatiguePill({ value, lang }) {
  const ur = lang === "ur";
  const v = Number.isFinite(value) ? value : 0;
  if (v < 0.2) return <span className={`px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold ${ur ? "ur" : ""}`}>{t(lang, "fatigueLow")}</span>;
  if (v < 0.5) return <span className={`px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold ${ur ? "ur" : ""}`}>{t(lang, "fatigueMod")}</span>;
  return <span className={`px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold ${ur ? "ur" : ""}`}>{t(lang, "fatigueHigh")}</span>;
}
