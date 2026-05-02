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

const MS_PER_HOUR = 1000 * 60 * 60;

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms) {
  if (!ms || ms < 1000) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${hrs}h ${r}m` : `${hrs}h`;
}

/**
 * Caregiver-facing progress dashboard.  Framework §8.2 says caregivers may
 * access overviews outside the child's lesson view; §9.2 says export is
 * caregiver-initiated with consent; §7.2/§7.3 says the dashboard should
 * surface adherence, jitter, fatigue, and mastery in plain language.
 *
 * No raw video / biometrics are shown.  Everything here comes from the
 * trial log and session log (both derived-metric-only).
 */
export default function CaregiverProgress() {
  const { user, profile } = useAuth();
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

  const totalPracticeMs = data.sessionLog.reduce(
    (a, s) => a + (s.durationMs || 0),
    0,
  );
  const totalAttempts = data.trialLog.length;
  const activationEvents = data.telemetryLog.filter((e) => e.event === "stroke-start");
  const lastFiveStarts = activationEvents.slice(-5);
  const successfulStarts = lastFiveStarts.length;
  const retriesPerStage =
    data.ladder.length > 0
      ? Math.round(
          data.ladder.reduce((a, s) => a + (s.attempts || 0), 0) /
            Math.max(1, data.ladder.length),
        )
      : 0;
  const recentFatigue = data.sessions.length
    ? data.sessions[0].fatigueIndex
    : computeFatigueIndex(data.trialLog.slice(-10));

  const generateReport = () => {
    const settings = getSettings();
    const next = buildCaregiverReadableReport({
      profile,
      settings,
      userId: user?.uid ?? "local",
    });
    setReportData(next);
    return next;
  };

  const openReportPreview = () => {
    const next = generateReport();
    if (next) setPreviewOpen(true);
  };

  const handleDownloadFromPreview = () => {
    if (!reportData) return;
    if (downloadFormat === "png") {
      downloadCaregiverReportPng(reportData);
      return;
    }
    downloadCaregiverReportPdf(reportData);
  };

  const avgAdherence =
    data.adherenceSpark.length > 0
      ? Math.round(
          data.adherenceSpark.reduce((a, b) => a + b, 0) /
            data.adherenceSpark.length,
        )
      : null;

  const cloudLogState = getCloudLogState();

  if (cloudLogState === "loading") {
    return (
      <div className="easeL-page-bg flex min-h-screen items-center justify-center pt-24">
        <div className="easeL-auth-card p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--easeL-primary)]" />
          <p className="font-semibold text-slate-700">Loading cloud progress data...</p>
        </div>
      </div>
    );
  }

  if (cloudLogState === "denied") {
    return (
      <div className="easeL-page-bg flex min-h-screen items-center justify-center px-6 pt-24">
        <div className="max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-slate-800">Permission denied</h2>
          <p className="mt-2 text-slate-600">
            We could not read cloud progress logs for this account. Please check Firestore rules.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="easeL-btn-outline mt-4 w-auto px-5"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (cloudLogState === "network") {
    return (
      <div className="easeL-page-bg flex min-h-screen items-center justify-center px-6 pt-24">
        <div className="max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-slate-800">Network error</h2>
          <p className="mt-2 text-slate-600">
            We could not fetch cloud progress logs. Please retry after reconnecting.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="easeL-btn-outline mt-4 w-auto px-5"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="easeL-page-bg min-h-screen px-6 pb-16 pt-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="easeL-accent-text-strong text-sm font-semibold tracking-wider">
              Caregiver dashboard
            </p>
            <h1 className="easeL-heading-1 mt-1">Progress overview</h1>
            <p className="easeL-text-muted mt-1 max-w-2xl">
              A summary of recent practice — attempts, accuracy, and fatigue.
              Used by caregivers and clinicians. This is not a medical report.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <button
              type="button"
              onClick={openReportPreview}
              className="easeL-interactive inline-flex items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--easeL-primary)_28%,white)] bg-[color-mix(in_srgb,var(--easeL-primary)_10%,white)] px-5 py-3 font-semibold text-[color:var(--easeL-primary)] shadow-sm hover:bg-[color-mix(in_srgb,var(--easeL-primary)_16%,white)] hover:shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>Preview & Download Report</span>
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryTile
            icon={BookOpen}
            label="Sessions"
            value={data.sessionLog.length}
          />
          <SummaryTile
            icon={Activity}
            label="Attempts"
            value={totalAttempts}
          />
          <SummaryTile
            icon={Timer}
            label="Practice time"
            value={
              totalPracticeMs > 0
                ? `${(totalPracticeMs / MS_PER_HOUR).toFixed(1)} h`
                : "—"
            }
          />
          <SummaryTile
            icon={TrendingUp}
            label="Avg adherence"
            value={avgAdherence != null ? `${avgAdherence}%` : "—"}
          />
          <SummaryTile
            icon={CheckCircle2}
            label="Starts (last 5)"
            value={`${successfulStarts}/5`}
          />
          <SummaryTile
            icon={Activity}
            label="Retries / level"
            value={retriesPerStage}
          />
        </section>

        <section className="easeL-card p-6">
          <h2 className="easeL-heading-2 mb-4">
            Level progress ladder
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--easeL-text-muted)" }}>
            Mastery uses level-specific thresholds (early levels are eased for learning momentum).
            The app silently adjusts support and advances when criteria are met.
          </p>
          <div className="space-y-2">
            {data.ladder.map((row) => {
              const mastered = row.status === "advance";
              const onThisStage = (profile?.currentLevel ?? profile?.currentStage ?? 0) === row.stage;
              return (
                <div
                  key={row.stage}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 ${
                    onThisStage
                      ? "border-[color:color-mix(in_srgb,var(--easeL-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--easeL-primary)_10%,white)]"
                      : mastered
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {mastered ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-slate-800">
                        Level {row.stage} · {row.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        Path {row.mode} · {row.attempts} attempts
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Pass rate</p>
                    <p className="font-bold text-slate-800">
                      {row.attempts > 0
                        ? `${Math.round(row.passRate * 100)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SparkCard
            title="Recent adherence"
            subtitle="Last 20 attempts · higher is better"
            values={data.adherenceSpark}
            scale={100}
            color={UI_TOKENS.lesson.tracePrimaryDark}
          />
          <SparkCard
            title="Cursor jitter"
            subtitle="Last 20 attempts · lower is better"
            values={data.jitterSpark}
            scale={Math.max(0.05, Math.max(...data.jitterSpark, 0.05))}
            color={UI_TOKENS.lesson.warning}
            invert
          />
        </section>

        <section className="easeL-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="easeL-heading-2">Recent sessions</h2>
              <p className="text-sm" style={{ color: "var(--easeL-text-muted)" }}>
                Adherence and fatigue index per session.
              </p>
            </div>
            {recentFatigue > 0.4 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Fatigue noted — shorter sessions suggested
              </div>
            )}
          </div>
          {data.sessions.length === 0 ? (
            <p className="text-slate-500 text-sm">No sessions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2">Date</th>
                    <th className="py-2">Path · level</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2">Attempts</th>
                    <th className="py-2">Avg adherence</th>
                    <th className="py-2">Fatigue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.slice(0, 10).map((s, idx) => (
                    <tr
                      key={`${s.timestamp}-${idx}`}
                      className="border-b border-slate-100"
                    >
                      <td className="py-3 text-slate-700">
                        {formatDate(s.timestamp)}
                      </td>
                      <td className="py-3 text-slate-700">
                        {s.mode ? `Path ${s.mode}` : "—"}
                        {s.stage != null ? ` · Level ${s.stage}` : ""}
                      </td>
                      <td className="py-3 text-slate-700">
                        {formatDuration(s.durationMs)}
                      </td>
                      <td className="py-3 text-slate-700">{s.attempts}</td>
                      <td className="py-3 text-slate-700">
                        {s.avgAdherence != null
                          ? `${Math.round(s.avgAdherence)}%`
                          : "—"}
                      </td>
                      <td className="py-3">
                        <FatiguePill value={s.fatigueIndex} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="rounded-3xl p-4 shadow-lg border-2 text-xs"
          style={{ background: "var(--easeL-bg-card-butter)", borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text-muted)" }}
        >
          EaseL stores only derived performance metrics on this device. No
          raw video, audio, or biometric templates are recorded or exported.
          This dashboard is intended for caregivers and clinicians as a
          quick reference — it is not a clinical assessment.
        </section>
      </div>

      {previewOpen && reportData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
          <div className="relative max-h-[88vh] w-full max-w-4xl overflow-auto rounded-3xl border border-white/60 bg-white p-6 shadow-2xl md:p-8">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close report preview"
            >
              <X className="h-5 w-5" />
            </button>

            <p className="text-sm font-semibold uppercase tracking-wide easeL-accent-text-strong">
              Report preview
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-800">EaseL Progress Report</h2>
            <p className="mt-1 text-sm text-slate-500">
              Child: {reportData.childName} · Path {reportData.pathId} · Level {reportData.pathLevel}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <PreviewStat label="Sessions" value={reportData.summary.sessions} />
              <PreviewStat label="Attempts" value={reportData.summary.attempts} />
              <PreviewStat
                label="Average adherence"
                value={
                  reportData.summary.avgAdherence != null
                    ? `${reportData.summary.avgAdherence}%`
                    : "—"
                }
              />
              <PreviewStat label="Trend" value={reportData.summary.adherenceTrend} />
              <PreviewStat
                label="Mastered levels"
                value={reportData.summary.levelsMastered}
              />
              <PreviewStat
                label="Needs support"
                value={reportData.summary.levelsNeedingSupport}
              />
            </div>

            <PreviewList title="Readable Summary" items={reportData.narrative} />
            <PreviewList title="Strengths" items={reportData.strengths} />
            <PreviewList title="Support Focus" items={reportData.supportsNeeded} />
            <PreviewList title="Recommendations" items={reportData.recommendations} />

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Download
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)]"
                >
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="png">Image (.png)</option>
                </select>
                <button
                  type="button"
                  onClick={handleDownloadFromPreview}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[color:var(--easeL-primary)] px-4 font-semibold text-white transition-all hover:opacity-95"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">{reportData.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

function PreviewList({ title, items }) {
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.map((item, idx) => (
          <p key={`${title}-${idx}`} className="text-sm text-slate-700">
            • {item}
          </p>
        ))}
      </div>
    </section>
  );
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg border border-white/50 flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: "color-mix(in srgb, var(--easeL-primary) 16%, white)" }}
      >
        {createElement(Icon, { className: "easeL-accent-text-strong h-5 w-5" })}
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

/** Simple inline sparkline (no extra deps). */
function SparkCard({ title, subtitle, values, scale, color, invert = false }) {
  const hasData = values.length > 0;
  const width = 260;
  const height = 60;
  const max = scale || 1;

  const points = hasData
    ? values
        .map((v, i) => {
          const x = (i / Math.max(1, values.length - 1)) * width;
          const normalised = Math.min(1, Math.max(0, v / max));
          const y = invert
            ? normalised * (height - 6) + 3
            : height - 3 - normalised * (height - 6);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ")
    : "";

  return (
    <div className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
      {hasData ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-16"
          preserveAspectRatio="none"
        >
          <polyline
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      ) : (
        <p className="text-slate-400 text-sm">Not enough data yet.</p>
      )}
    </div>
  );
}

function FatiguePill({ value }) {
  const v = Number.isFinite(value) ? value : 0;
  if (v < 0.2) {
    return (
      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
        Low
      </span>
    );
  }
  if (v < 0.5) {
    return (
      <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
        Moderate
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold">
      High
    </span>
  );
}
