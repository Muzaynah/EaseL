import { MODE_1_TIERS, MODE_2_TIERS } from "./modeConfig";
import { setProfileInFirestore } from "../firebase/profile";
import { hasConfig } from "../firebase/config";

const TRIAL_HISTORY_KEY = (userId, mode, tier) => `${userId}-${mode}-${tier}`;
const recentTrialsByKey = {};

function getRecentTrials(userId, mode, tier) {
  const key = TRIAL_HISTORY_KEY(userId, mode, tier);
  if (!recentTrialsByKey[key]) recentTrialsByKey[key] = [];
  return recentTrialsByKey[key];
}

export function logTrialResult(userId, mode, tier, result) {
  const recentTrials = getRecentTrials(userId, mode, tier);
  const withTimestamp = { ...result, timestamp: result.timestamp ?? Date.now() };
  recentTrials.push(withTimestamp);
  if (recentTrials.length > 10) recentTrials.shift();
  checkMastery(userId, mode, tier);
}

async function checkMastery(userId, mode, tier) {
  const recentTrials = getRecentTrials(userId, mode, tier);
  if (recentTrials.length < 5) return;

  const lastFive = recentTrials.slice(-5);
  const successCount = lastFive.filter((t) => t.success).length;
  const tierConfig = mode === 1 ? MODE_1_TIERS[tier] : MODE_2_TIERS[tier];
  if (!tierConfig) return;

  if (successCount >= 3 && tier < 2) {
    console.log(`Mastery achieved! Advancing from tier ${tier} to ${tier + 1}`);
    await advanceTier(userId, tier + 1);
    recentTrialsByKey[TRIAL_HISTORY_KEY(userId, mode, tier)] = [];
  } else if (successCount <= 1 && tier > 0) {
    console.log(`Struggling. Reducing from tier ${tier} to ${tier - 1}`);
    await advanceTier(userId, tier - 1);
    recentTrialsByKey[TRIAL_HISTORY_KEY(userId, mode, tier)] = [];
  }
}

async function advanceTier(userId, newTier) {
  if (!hasConfig) return;
  try {
    await setProfileInFirestore(userId, {
      currentStage: newTier,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("masteryLogic: advanceTier failed", e);
  }
}

export function clearTrialHistory(userId, mode, tier) {
  const key = TRIAL_HISTORY_KEY(userId, mode ?? 1, tier ?? 0);
  delete recentTrialsByKey[key];
}
