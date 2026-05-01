/**
 * Framework §9.2 + Appendix C: caregiver-initiated export. Produces a JSON
 * payload that contains only derived metrics (no raw video, no biometric
 * templates, no free-text). The format tracks Appendix C's data dictionary:
 *   - User profile (functional, not clinical)
 *   - Calibration snapshot
 *   - Trial log
 *   - Session log
 */

import { getTrialLog, getSessionLog } from "./persistence";
import { computeStageLadder, summariseSessions, recentAdherences } from "./stageAdaptation";

export function buildCaregiverExport({ profile, settings }) {
  const now = new Date().toISOString();
  return {
    exportedAt: now,
    schemaVersion: "easeL-export-1.0",
    userProfile: {
      language: profile?.caregiverReported?.language ?? "en",
      pathId: profile?.pathId ?? profile?.lipMode ?? null,
      pathLevel: profile?.pathLevel ?? null,
      currentLevel: profile?.currentLevel ?? profile?.currentStage ?? 0,
      // Legacy compatibility fields kept for older dashboards.
      lipMode: profile?.lipMode ?? null,
      lipTier: profile?.lipTier ?? null,
      independentUse: profile?.independentUse ?? null,
      currentStage: profile?.currentStage ?? 0,
      tutorialPassed: profile?.tutorialPassed ?? null,
      sessionLengthPreference: profile?.sessionLengthPreference ?? null,
      useDwellActivation: profile?.useDwellActivation ?? false,
      caregiverReported: profile?.caregiverReported ?? null,
      screenerMetrics: profile?.screenerMetrics ?? null,
    },
    calibration: profile?.calibration
      ? {
          activationMethod: profile.calibration.activationMethod ?? null,
          sensitivity: profile.calibration.sensitivity ?? null,
          deadzone: profile.calibration.deadzone ?? null,
          neutralPosition: profile.calibration.neutralPosition ?? null,
          movementRange: profile.calibration.movementRange ?? null,
          lastCalibratedAt: profile.calibration.lastCalibratedAt ?? null,
        }
      : null,
    accessibilitySettings: settings
      ? {
          headSensitivity: settings.headSensitivity ?? null,
          gestureSensitivity: settings.gestureSensitivity ?? null,
          deadZone: settings.deadZone ?? null,
          audioFeedback: settings.audioFeedback ?? null,
          highContrast: settings.highContrast ?? null,
        }
      : null,
    trialLog: getTrialLog(),
    sessionLog: getSessionLog(),
    disclaimer:
      "EaseL is not a medical device. This export contains only derived " +
      "performance metrics — no raw video, audio, or biometric templates.",
  };
}

export function downloadCaregiverExport(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    `easeL-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDateTime(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
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
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function fatigueLabel(v) {
  if (!Number.isFinite(v)) return "Unknown";
  if (v < 0.2) return "Low";
  if (v < 0.5) return "Moderate";
  return "High";
}

function adherenceTrend(values) {
  if (!Array.isArray(values) || values.length < 6) return "Not enough recent data";
  const half = Math.floor(values.length / 2);
  const early = values.slice(0, half);
  const late = values.slice(half);
  const earlyAvg = early.reduce((a, b) => a + b, 0) / Math.max(1, early.length);
  const lateAvg = late.reduce((a, b) => a + b, 0) / Math.max(1, late.length);
  const delta = lateAvg - earlyAvg;
  if (delta > 4) return "Improving";
  if (delta < -4) return "Needs support";
  return "Stable";
}

export function buildCaregiverReadableReport({ profile, settings, userId }) {
  const trialLog = getTrialLog();
  const sessionLog = getSessionLog();
  const ladder = computeStageLadder(trialLog, userId ?? "local");
  const sessions = summariseSessions(trialLog, sessionLog);
  const adherenceSeries = recentAdherences(trialLog, 20);
  const avgAdherence =
    adherenceSeries.length > 0
      ? Math.round(adherenceSeries.reduce((a, b) => a + b, 0) / adherenceSeries.length)
      : null;
  const totalPracticeMs = sessionLog.reduce((a, s) => a + (s.durationMs || 0), 0);
  const mastered = ladder.filter((s) => s.status === "advance").length;
  const struggled = ladder.filter((s) => s.status === "widen").length;
  const improving = ladder.filter((s) => s.reason === "improving").length;
  const currentLevel = profile?.currentLevel ?? profile?.currentStage ?? 0;
  const latestSession = sessions[0] ?? null;
  const childName = profile?.caregiverReported?.childName || "Learner";

  return {
    exportedAt: Date.now(),
    childName,
    pathId: profile?.pathId ?? profile?.lipMode ?? "—",
    pathLevel: profile?.pathLevel ?? "—",
    currentLevel,
    summary: {
      sessions: sessionLog.length,
      attempts: trialLog.length,
      totalPracticeMs,
      avgAdherence,
      adherenceTrend: adherenceTrend(adherenceSeries),
      levelsMastered: mastered,
      levelsNeedingSupport: struggled,
      levelsInProgress: improving,
      latestFatigue: latestSession ? fatigueLabel(latestSession.fatigueIndex) : "Unknown",
    },
    narrative: [
      `${childName} has completed ${sessionLog.length} practice session${sessionLog.length === 1 ? "" : "s"} and ${trialLog.length} total attempts.`,
      avgAdherence == null
        ? "Adherence data is still being collected."
        : `Average recent adherence is ${avgAdherence}%, with an overall trend of ${adherenceTrend(adherenceSeries).toLowerCase()}.`,
      `Current placement is Path ${profile?.pathId ?? profile?.lipMode ?? "—"}, Level ${profile?.pathLevel ?? "—"}, and active lesson level ${currentLevel}.`,
      latestSession
        ? `Most recent session fatigue was ${fatigueLabel(latestSession.fatigueIndex).toLowerCase()}, with ${latestSession.attempts} attempts over ${formatDuration(latestSession.durationMs)}.`
        : "No completed session summary is available yet.",
    ],
    strengths: [
      avgAdherence != null && avgAdherence >= 80
        ? "Strong overall movement accuracy in recent attempts."
        : "Accuracy is developing and responds to repeated practice.",
      mastered >= 2
        ? "Multiple levels are already mastered, showing steady progression."
        : "Early levels are in progress, which is expected in initial learning.",
      latestSession && latestSession.fatigueIndex < 0.2
        ? "Recent practice endurance is good with low fatigue signs."
        : "Fatigue management remains important for sustained performance.",
    ],
    supportsNeeded: [
      struggled > 0
        ? `${struggled} level(s) currently need extra support/adaptation.`
        : "No major support flags detected in current stage analysis.",
      avgAdherence != null && avgAdherence < 70
        ? "Prioritize consistency drills before increasing complexity."
        : "Continue progressive challenge while preserving consistency.",
      latestSession && latestSession.fatigueIndex >= 0.5
        ? "Use shorter sessions with more frequent breaks."
        : "Maintain current pacing and monitor fatigue weekly.",
    ],
    recommendations: [
      "Continue short, frequent sessions and stop early when fatigue rises.",
      "Focus on consistency before increasing task complexity.",
      "Review this summary weekly to track trend direction rather than single-session variation.",
    ],
    settings: {
      headSensitivity: settings?.headSensitivity ?? "—",
      deadZone: settings?.deadZone ?? "—",
      activationMethod: profile?.calibration?.activationMethod ?? "—",
    },
    disclaimer:
      "EaseL is not a medical device. This report summarises derived performance metrics only and does not include raw video, audio, or biometric templates.",
  };
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
  return cursorY + lineHeight;
}

function renderReportCanvas(report) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1980;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1a1526";
  ctx.font = "700 50px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("EaseL Progress Report", 80, 100);

  ctx.font = "400 24px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#3f3850";
  ctx.fillText(`Generated: ${formatDateTime(report.exportedAt)}`, 80, 145);
  ctx.fillText(`Child: ${report.childName}`, 80, 180);

  let y = 250;
  ctx.fillStyle = "#1a1526";
  ctx.font = "700 30px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("Snapshot", 80, y);
  y += 50;
  ctx.font = "400 24px 'Plus Jakarta Sans', Arial, sans-serif";
  const snapshot = [
    `Path: ${report.pathId} · Level: ${report.pathLevel} · Active lesson level: ${report.currentLevel}`,
    `Sessions: ${report.summary.sessions} · Attempts: ${report.summary.attempts} · Practice time: ${formatDuration(report.summary.totalPracticeMs)}`,
    `Average adherence: ${report.summary.avgAdherence != null ? `${report.summary.avgAdherence}%` : "—"} · Trend: ${report.summary.adherenceTrend}`,
    `Levels mastered: ${report.summary.levelsMastered} · In progress: ${report.summary.levelsInProgress} · Need support: ${report.summary.levelsNeedingSupport}`,
    `Latest fatigue: ${report.summary.latestFatigue}`,
  ];
  for (const line of snapshot) {
    y = wrapCanvasText(ctx, line, 80, y, 1240, 34);
  }

  y += 20;
  ctx.font = "700 30px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#1a1526";
  ctx.fillText("Readable Summary", 80, y);
  y += 45;
  ctx.font = "400 24px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#3f3850";
  for (const p of report.narrative) {
    y = wrapCanvasText(ctx, p, 80, y, 1240, 34);
    y += 6;
  }

  y += 16;
  ctx.font = "700 30px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#1a1526";
  ctx.fillText("Strengths", 80, y);
  y += 45;
  ctx.font = "400 24px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#3f3850";
  report.strengths.forEach((item) => {
    y = wrapCanvasText(ctx, `• ${item}`, 80, y, 1240, 34);
  });

  y += 12;
  ctx.font = "700 30px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#1a1526";
  ctx.fillText("Support Focus", 80, y);
  y += 45;
  ctx.font = "400 24px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#3f3850";
  report.supportsNeeded.forEach((item) => {
    y = wrapCanvasText(ctx, `• ${item}`, 80, y, 1240, 34);
  });

  y += 12;
  ctx.font = "700 30px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#1a1526";
  ctx.fillText("Recommendations", 80, y);
  y += 45;
  ctx.font = "400 24px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillStyle = "#3f3850";
  report.recommendations.forEach((rec) => {
    y = wrapCanvasText(ctx, `• ${rec}`, 80, y, 1240, 34);
  });

  ctx.fillStyle = "#5a5368";
  ctx.font = "400 18px 'Plus Jakarta Sans', Arial, sans-serif";
  wrapCanvasText(ctx, report.disclaimer, 80, 1910, 1240, 24);

  return canvas;
}

export function downloadCaregiverReportPng(report, filename) {
  const canvas = renderReportCanvas(report);
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      filename ??
      `easeL-progress-report-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function downloadCaregiverReportPdf(report) {
  const html = `
    <html>
      <head>
        <title>EaseL Progress Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #1a1526; }
          h1, h2 { margin: 0 0 12px; }
          p, li { line-height: 1.5; }
          .muted { color: #4b5563; }
          .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px; margin: 12px 0; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>EaseL Progress Report</h1>
        <p class="muted">Generated: ${formatDateTime(report.exportedAt)}</p>
        <p><strong>Child:</strong> ${report.childName}</p>
        <div class="card">
          <p><strong>Path/Level:</strong> Path ${report.pathId} · Level ${report.pathLevel} · Active lesson level ${report.currentLevel}</p>
          <p><strong>Sessions:</strong> ${report.summary.sessions} · <strong>Attempts:</strong> ${report.summary.attempts} · <strong>Practice time:</strong> ${formatDuration(report.summary.totalPracticeMs)}</p>
          <p><strong>Average adherence:</strong> ${report.summary.avgAdherence != null ? `${report.summary.avgAdherence}%` : "—"} · <strong>Trend:</strong> ${report.summary.adherenceTrend}</p>
          <p><strong>Levels mastered:</strong> ${report.summary.levelsMastered} · <strong>In progress:</strong> ${report.summary.levelsInProgress} · <strong>Need support:</strong> ${report.summary.levelsNeedingSupport}</p>
          <p><strong>Latest fatigue:</strong> ${report.summary.latestFatigue}</p>
        </div>
        <h2>Readable Summary</h2>
        ${report.narrative.map((n) => `<p>${n}</p>`).join("")}
        <h2>Strengths</h2>
        <ul>${report.strengths.map((r) => `<li>${r}</li>`).join("")}</ul>
        <h2>Support Focus</h2>
        <ul>${report.supportsNeeded.map((r) => `<li>${r}</li>`).join("")}</ul>
        <h2>Recommendations</h2>
        <ul>${report.recommendations.map((r) => `<li>${r}</li>`).join("")}</ul>
        <p class="muted">${report.disclaimer}</p>
      </body>
    </html>
  `;

  const w = window.open("", "_blank", "width=1100,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
