import { easeLPalette } from "./paletteTokens";

/**
 * Centralized UI token map for JS-driven surfaces (canvas, controls, settings).
 * Update this file to change app-wide color behavior from one place.
 */
export const UI_TOKENS = {
  app: {
    primary: "#613DFF",
  },
  lesson: {
    canvasBg: "#F5F5F5",
    corridorRoad: "#6C8EA2",
    corridorGuide: "#E45B43",
    tracePrimary: "#2F6F95",
    tracePrimaryDark: "#235875",
    success: "#8F74FF",
    successSoft: "#22B892",
    startSoft: "#22B892",
    warning: "#E45B43",
    danger: "#E45B43",
    neutralMarker: "#6C8EA2",
    ghost: "#8F74FF",
    gaugeTrack: "#F5B4AA",
    gaugeMarker: "#2F6F95",
    gaugePass: "#8F74FF",
  },
  brush: {
    default: "#000000",
    // Artist-grade palette — conventional pigment names
    palette: [
      "#FFFFFF", // Titanium White
      "#FFF44F", // Lemon Yellow
      "#FFD700", // Cadmium Yellow
      "#FFA500", // Orange
      "#E34234", // Vermillion
      "#E30022", // Cadmium Red
      "#DC143C", // Crimson
      "#800080", // Purple/Violet
      "#120A8F", // Ultramarine Blue
      "#0047AB", // Cobalt Blue
      "#00BFFF", // Sky Blue/Cerulean
      "#50C878", // Emerald Green
      "#507D2A", // Sap Green
      "#CCAA2B", // Yellow Ochre
      "#E97451", // Burnt Sienna
      "#826644", // Raw Umber
      "#536878", // Payne's Gray
      "#000000", // Ivory Black
    ],
    vibrantPalette: [
      "#FFFFFF", // Titanium White
      "#FFF44F", // Lemon Yellow
      "#FFD700", // Cadmium Yellow
      "#FFA500", // Orange
      "#E34234", // Vermillion
      "#E30022", // Cadmium Red
      "#DC143C", // Crimson
      "#800080", // Purple/Violet
      "#120A8F", // Ultramarine Blue
      "#0047AB", // Cobalt Blue
      "#00BFFF", // Sky Blue/Cerulean
      "#50C878", // Emerald Green
      "#507D2A", // Sap Green
      "#CCAA2B", // Yellow Ochre
      "#E97451", // Burnt Sienna
      "#826644", // Raw Umber
      "#536878", // Payne's Gray
      "#000000", // Ivory Black
    ],
  },
};
