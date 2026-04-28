import { useMemo, createElement } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Download,
  TrendingUp,
  Activity,
  Timer,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTrialLog, getSessionLog, getSettings, getTelemetryLog } from "../utils/persistence";
import {
  computeStageLadder,
  summariseSessions,
  recentAdherences,
  recentJitter,
  computeFatigueIndex,
} from "../utils/stageAdaptation";
import { buildCaregiverExport, downloadCaregiverExport } from "../utils/dataExport";

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

  const handleExport = () => {
    const ok =
      typeof window !== "undefined" &&
      window.confirm(
        "Export a JSON file with your child's derived performance metrics? " +
          "No raw video or biometric data is included. EaseL is not a medical device.",
      );
    if (!ok) return;
    const settings = getSettings();
    const payload = buildCaregiverExport({ profile, settings });
    downloadCaregiverExport(payload);
  };

  const avgAdherence =
    data.adherenceSpark.length > 0
      ? Math.round(
          data.adherenceSpark.reduce((a, b) => a + b, 0) /
            data.adherenceSpark.length,
        )
      : null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
              Caregiver dashboard
            </p>
            <h1 className="text-3xl font-bold text-slate-800 mt-1">
              Progress overview
            </h1>
            <p className="text-slate-600 mt-1 max-w-2xl">
              A summary of recent practice — attempts, accuracy, and fatigue.
              Used by caregivers and clinicians. This is not a medical report.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-700 font-semibold border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95"
            >
              <BookOpen className="w-4 h-4" />
              Back to app
            </Link>
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

        <section className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            Level progress ladder
          </h2>
          <p className="text-sm text-slate-500 mb-4">
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
                      ? "bg-indigo-50 border-indigo-300"
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
            color="#4338CA"
          />
          <SparkCard
            title="Cursor jitter"
            subtitle="Last 20 attempts · lower is better"
            values={data.jitterSpark}
            scale={Math.max(0.05, Math.max(...data.jitterSpark, 0.05))}
            color="#F59E0B"
            invert
          />
        </section>

        <section className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Recent sessions</h2>
              <p className="text-sm text-slate-500">
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

        <section className="bg-white/90 backdrop-blur rounded-3xl p-4 shadow-lg border border-white/50 text-xs text-slate-500">
          EaseL stores only derived performance metrics on this device. No
          raw video, audio, or biometric templates are recorded or exported.
          This dashboard is intended for caregivers and clinicians as a
          quick reference — it is not a clinical assessment.
        </section>
      </div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg border border-white/50 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
        {createElement(Icon, { className: "w-5 h-5 text-indigo-600" })}
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
