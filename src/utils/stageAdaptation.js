/**
 * Framework §7 — Precision Learning & Adaptation.
 *
 * Pure, deterministic helpers for reading the trial log and deciding:
 *   - Did the user just master this stage? (advance)
 *   - Are they trending up but not yet stable? (hold)
 *   - Are they struggling? (widen assistance)
 * Plus per-trial assistance tuning (corridor width, autocomplete, hold radius)
 * and a session fatigue index (§5.4, §7.2).
 *
 * Everything in this file is pure — no React, no IO — so it can be unit-tested
 * and reused by both Mode 1 and Mode 2 lessons and the caregiver dashboard.
 */

import { getStage } from "./lessonContent";

// ---- constants tuned against the framework thresholds --------------------

// Mastery requires k-of-n passes.  Framework §7.3 leaves these individual
// parameters to the author; we pick conservative defaults that are forgiving
// for CP users while still being meaningful.
const DEFAULT_MASTERY_WINDOW = 4;   // last n attempts considered
const DEFAULT_MASTERY_PASSES = 3;   // k of n must pass

// "Pass" means meeting the stage's required adherence (for trace stages) OR
// the binary success flag from the trial (hold/activation stages).
// jitter is a soft gate — a user with very noisy tilt data shouldn't be
// advanced into a harder corridor even if their raw adherence is nominal.
const MAX_MEAN_JITTER_FOR_ADVANCE = 0.018;
const MAX_MEAN_JITTER_STAGE3 = 0.03;

// Fatigue index is a 0..1 score comparing later-trial performance to the
// first trials of the same session.  >0.5 triggers shortened break intervals.
const FATIGUE_EARLY_WINDOW = 3;
const FATIGUE_LATE_WINDOW = 3;

// ---- trial-log filtering --------------------------------------------------

/** Most recent trials for a given user + mode + stage, newest last. */
export function filterTrials(trialLog, { userId, mode, stage }) {
  if (!Array.isArray(trialLog)) return [];
  return trialLog.filter(
    (t) =>
      (!userId || t.userId === userId) &&
      (mode == null || t.mode === mode) &&
      (stage == null || t.stage === stage),
  );
}

export function mostRecent(trials, n) {
  if (!Array.isArray(trials) || n <= 0) return [];
  return trials.slice(-n);
}

// ---- per-trial pass classification ---------------------------------------

/**
 * A trial "passes" when it was successful AND the user wasn't just riding the
 * autocomplete — for trace stages that means meeting the stage's required
 * adherence, for hold/activation stages the binary success flag is enough.
 */
export function didTrialPass(trial, stageDef) {
  if (!trial) return false;
  if (!stageDef) return Boolean(trial.success);
  if (stageDef.requiredAdherence != null && typeof trial.adherence === "number") {
    return trial.adherence >= stageDef.requiredAdherence;
  }
  return Boolean(trial.success);
}

// ---- fatigue index (§5.4, §7.2) ------------------------------------------

/**
 * Compute a session-local fatigue index in [0, 1].  0 = no fatigue detected,
 * 1 = sharp performance drop late in the session.  For hold/activation stages
 * we use durationMs as the proxy (longer = more effort); for trace stages we
 * use adherence (lower = worse).
 */
export function computeFatigueIndex(sessionTrials) {
  if (!Array.isArray(sessionTrials) || sessionTrials.length < FATIGUE_EARLY_WINDOW + FATIGUE_LATE_WINDOW) {
    return 0;
  }
  const early = sessionTrials.slice(0, FATIGUE_EARLY_WINDOW);
  const late = sessionTrials.slice(-FATIGUE_LATE_WINDOW);

  function scoreOne(t) {
    if (typeof t.adherence === "number") return t.adherence;
    // Lower duration is better for hold/activation when they pass, but we
    // care about a DROP in performance, so flip so that higher = "better".
    if (t.success === false) return 0;
    if (typeof t.durationMs === "number" && t.durationMs > 0) {
      return Math.max(0, 100 - Math.min(100, t.durationMs / 60));
    }
    return t.success ? 60 : 20;
  }
  const earlyAvg = early.reduce((a, t) => a + scoreOne(t), 0) / early.length;
  const lateAvg = late.reduce((a, t) => a + scoreOne(t), 0) / late.length;
  if (earlyAvg <= 0) return 0;
  const drop = (earlyAvg - lateAvg) / earlyAvg;
  return Math.max(0, Math.min(1, drop));
}

// ---- mastery state (§7.3) -------------------------------------------------

/**
 * Returns a descriptor for whether the user should advance, hold, or be
 * granted more assistance based on the most recent trials for a stage.
 *
 * Contract:
 *   {
 *     status: "advance" | "hold" | "widen",
 *     passCount, passRate, meanJitter, window,
 *     reason: human-readable short label
 *   }
 */
export function evaluateMastery(stageDef, recentTrials) {
  // Respect stage-specific mastery windows from lesson content where present.
  // Stage 3 is intentionally eased: we want early momentum in Mode 2.
  const targetWindow =
    stageDef?.stage === 3
      ? 3
      : Math.max(3, stageDef?.trialsForMastery ?? DEFAULT_MASTERY_WINDOW);
  const targetPasses =
    stageDef?.stage <= 2
      ? Math.min(targetWindow, 2)
      : stageDef?.stage === 3
      ? 2
      : Math.min(targetWindow, Math.max(2, DEFAULT_MASTERY_PASSES));
  const jitterGate =
    stageDef?.stage === 3 ? MAX_MEAN_JITTER_STAGE3 : MAX_MEAN_JITTER_FOR_ADVANCE;

  const window = mostRecent(recentTrials, targetWindow);
  const passCount = window.filter((t) => didTrialPass(t, stageDef)).length;
  const passRate = window.length > 0 ? passCount / window.length : 0;
  const meanJitter =
    window.length > 0
      ? window.reduce((a, t) => a + (t.jitter ?? 0), 0) / window.length
      : 0;

  // Not enough data to form an opinion — hold and keep practising.
  if (window.length < targetWindow) {
    return {
      status: "hold",
      passCount,
      passRate,
      meanJitter,
      window: window.length,
      reason: "gathering-data",
    };
  }

  if (passCount >= targetPasses && meanJitter <= jitterGate) {
    return {
      status: "advance",
      passCount,
      passRate,
      meanJitter,
      window: window.length,
      reason: "mastered",
    };
  }

  const widenTrigger = stageDef?.stage <= 2 ? 2 : 1;
  if (passCount <= widenTrigger) {
    return {
      status: "widen",
      passCount,
      passRate,
      meanJitter,
      window: window.length,
      reason: "struggling",
    };
  }

  return {
    status: "hold",
    passCount,
    passRate,
    meanJitter,
    window: window.length,
    reason: "improving",
  };
}

export function getMasteryFeedback(stageDef, mastery) {
  if (!stageDef || !mastery) return "Keep practicing.";
  if (mastery.status === "advance") return "Great progress - stage unlocked.";
  if (mastery.reason === "gathering-data") {
    return `Need ${Math.max(0, (stageDef.stage <= 2 ? 2 : 3) - mastery.passCount)} more successful attempts.`;
  }
  if (mastery.status === "widen") return "Adjusting support to make the next try easier.";
  return `Almost there: ${mastery.passCount}/${mastery.window} successful attempts.`;
}

// ---- per-attempt assistance tuning (§7.4) --------------------------------

/**
 * Given the base stage definition and a recent trial history, return an
 * ADAPTED version of the stage's assistance parameters.  Widens corridor /
 * hold radius when the user is struggling; narrows them (modestly) when the
 * user is consistently mastering the task.  Never changes `requiredAdherence`
 * because that's the measurement yardstick for mastery itself.
 *
 * Framework §3.5 "compensate for motor impairment implicitly, not frame
 * imprecision as failure" — so the corridor widens SILENTLY; the user sees
 * a visually friendlier path next attempt with no failure messaging.
 */
export function getAdaptedStage(stageDef, recentTrials) {
  if (!stageDef) return stageDef;
  const mastery = evaluateMastery(stageDef, recentTrials);

  let widthMul = 1;
  let holdRadiusMul = 1;
  let holdMsDelta = 0;
  let autocompleteDelta = 0;

  if (mastery.status === "widen") {
    widthMul = 1.3;
    holdRadiusMul = 1.2;
    holdMsDelta = -300;     // easier to hold
    autocompleteDelta = +15; // more system-assisted completion
  } else if (mastery.status === "advance") {
    widthMul = 0.92;
    holdRadiusMul = 0.95;
    holdMsDelta = +200;
    autocompleteDelta = -10;
  }

  return {
    ...stageDef,
    corridorWidth: Math.round((stageDef.corridorWidth ?? 0) * widthMul),
    holdRadius: Math.round((stageDef.holdRadius ?? 0) * holdRadiusMul),
    holdMs: Math.max(800, (stageDef.holdMs ?? 0) + holdMsDelta),
    autocompleteLevel: Math.max(
      0,
      Math.min(100, (stageDef.autocompleteLevel ?? 0) + autocompleteDelta),
    ),
    _adaptation: mastery,
  };
}

// ---- auto-advance decision -----------------------------------------------

/**
 * Given the user's profile and the latest trial log, returns the stage the
 * user SHOULD be on now (or null if no change).  Callers decide how to
 * persist this (typically by updating `profile.currentStage`).
 *
 * Only advances forward — never auto-regresses.  Stages stop at 6 until
 * stage 7+ are implemented.
 */
export function maybeAdvanceStage({ profile, trialLog, userId }) {
  if (!profile) return null;
  const current = profile.currentStage ?? 0;
  if (current >= 6) return null; // top of the current ladder

  const stageDef = getStage(current);
  if (!stageDef) return null;

  const stageTrials = filterTrials(trialLog, {
    userId,
    mode: stageDef.mode,
    stage: current,
  });
  const mastery = evaluateMastery(stageDef, stageTrials);
  if (mastery.status === "advance") return current + 1;
  return null;
}

// ---- caregiver dashboard helpers -----------------------------------------

/** Mastery status per stage for drawing the progress ladder. */
export function computeStageLadder(trialLog, userId) {
  return [0, 1, 2, 3, 4, 5, 6].map((stage) => {
    const def = getStage(stage);
    const stageTrials = filterTrials(trialLog, { userId, mode: def.mode, stage });
    const mastery = evaluateMastery(def, stageTrials);
    return {
      stage,
      title: def.title,
      mode: def.mode,
      attempts: stageTrials.length,
      passRate: mastery.passRate,
      status: mastery.status,
      reason: mastery.reason,
    };
  });
}

/**
 * Group the trial log by session (sessions as recorded in session log).
 * Returns per-session summary rows sorted newest-first.
 */
export function summariseSessions(trialLog, sessionLog) {
  if (!Array.isArray(sessionLog) || sessionLog.length === 0) return [];

  // A trial belongs to a session if its timestamp falls inside the session's
  // [start, start+duration] window.  We reconstruct the start as
  // (sessionRow.timestamp - durationMs) because appendSessionLog writes at
  // session end.
  return sessionLog
    .slice()
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .map((s) => {
      const end = s.timestamp ?? Date.now();
      const start = end - (s.durationMs ?? 0);
      const sessionTrials = (trialLog ?? []).filter(
        (t) => (t.timestamp ?? 0) >= start && (t.timestamp ?? 0) <= end,
      );
      const fatigue = computeFatigueIndex(sessionTrials);
      const adherences = sessionTrials
        .map((t) => t.adherence)
        .filter((v) => typeof v === "number");
      const avgAdherence =
        adherences.length > 0
          ? adherences.reduce((a, b) => a + b, 0) / adherences.length
          : null;
      return {
        timestamp: end,
        mode: s.mode,
        stage: s.stage,
        durationMs: s.durationMs ?? 0,
        attempts: sessionTrials.length,
        reinforcementsFired: s.reinforcementsFired ?? 0,
        completion: s.completion ?? "exit",
        avgAdherence,
        fatigueIndex: fatigue,
      };
    });
}

/** Last N adherence values for a sparkline. */
export function recentAdherences(trialLog, n = 20) {
  return (trialLog ?? [])
    .filter((t) => typeof t.adherence === "number")
    .slice(-n)
    .map((t) => t.adherence);
}

/** Last N mean-jitter values for a sparkline. */
export function recentJitter(trialLog, n = 20) {
  return (trialLog ?? [])
    .filter((t) => typeof t.jitter === "number")
    .slice(-n)
    .map((t) => t.jitter);
}
