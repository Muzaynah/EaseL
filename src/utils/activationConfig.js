import { getEffectiveActivationMethod } from "./profileSchema";

export const ACTIVATION_PRESETS = {
  lessons: {
    mouthOpenThreshold: 0.022,
    framesToConfirm: 1,
    cooldownMs: 250,
    dwellMs: 3000,
    dwellRadius: 18,
  },
  canvas: {
    mouthOpenThreshold: 0.022,
    framesToConfirm: 1,
    cooldownMs: 250,
    dwellMs: 3000,
    dwellRadius: 18,
  },
};

export function resolveActivationConfig(profile, area = "lessons") {
  const preset = ACTIVATION_PRESETS[area] ?? ACTIVATION_PRESETS.lessons;
  return {
    activationMethod: getEffectiveActivationMethod(profile),
    ...preset,
  };
}

