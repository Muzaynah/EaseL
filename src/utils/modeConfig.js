export const MODE_1_TIERS = {
  0: {
    name: "Maximum Assistance",
    autocompleteLevel: 100,
    targetSize: 200,
    targetCount: 1,
    requiredAccuracy: 60,
    trialsForMastery: 5,
  },
  1: {
    name: "Reduced Assistance",
    autocompleteLevel: 70,
    targetSize: 150,
    targetCount: 2,
    requiredAccuracy: 70,
    trialsForMastery: 5,
  },
  2: {
    name: "Minimal Assistance",
    autocompleteLevel: 40,
    targetSize: 120,
    targetCount: 4,
    requiredAccuracy: 80,
    trialsForMastery: 5,
  },
};

export const MODE_2_TIERS = {
  0: {
    name: "Wide Corridor",
    corridorWidth: 150,
    corridorLength: 400,
    corridorType: "straight",
    requiredAdherence: 60,
    trialsForMastery: 5,
  },
  1: {
    name: "Medium Corridor",
    corridorWidth: 100,
    corridorLength: 500,
    corridorType: "gentle-curve",
    requiredAdherence: 70,
    trialsForMastery: 5,
  },
  2: {
    name: "Narrow Corridor",
    corridorWidth: 60,
    corridorLength: 600,
    corridorType: "complex-curve",
    requiredAdherence: 80,
    trialsForMastery: 5,
  },
};

export function getCurrentTierConfig(mode, tier) {
  return mode === 1 ? MODE_1_TIERS[tier] : MODE_2_TIERS[tier];
}
