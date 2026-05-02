import { easeLPalette } from "./paletteTokens";

/**
 * Centralized UI token map for JS-driven surfaces (canvas, controls, settings).
 * Update this file to change app-wide color behavior from one place.
 */
export const UI_TOKENS = {
  brush: {
    default: "#000000",
    palette: [
      "#2F6F95",
      "#235875",
      "#3F82AD",
      "#5C8198",
      "#7292A9",
      "#E45B43",
      "#F06D59",
      "#C37A71",
      "#F39C90",
      "#F5B4AA",
      "#22B892",
      "#1DA380",
      "#9FAAA8",
      "#A8E8D4",
      "#8F74FF",
      "#A48DFF",
      "#B7B9DA",
      "#BABDF5",
      "#E6E8F4",
      "#BABDF5",
      "#F5F5F5",
      "#ffffff",
      "#000000",
    ],
  },
  lesson: {
    canvasBg: "#F5F5F5",
    corridorRoad: "#6C8EA2",
    corridorGuide: "#E45B43",
    tracePrimary: "#2F6F95",
    tracePrimaryDark: "#235875",
    success: "#8F74FF",
    successSoft: "#22B892",
    warning: "#E45B43",
    danger: "#E45B43",
    neutralMarker: "#6C8EA2",
    ghost: "#8F74FF",
    gaugeTrack: "#F5B4AA",
    gaugeMarker: "#2F6F95",
    gaugePass: "#8F74FF",
  },
  app: {
    primary: easeLPalette.primary,
    text: easeLPalette.text,
    textMuted: easeLPalette.textMuted,
    surface: easeLPalette.bgSection,
  },
};
