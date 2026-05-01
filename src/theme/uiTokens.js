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
      "#F8C0B8",
      "#22B892",
      "#1DA380",
      "#9FAAA8",
      "#BAF0DE",
      "#8F74FF",
      "#A48DFF",
      "#B7B9DA",
      "#C8C9FF",
      "#D7D9F8",
      "#C8C9FF",
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
    gaugeTrack: "#F8C0B8",
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
