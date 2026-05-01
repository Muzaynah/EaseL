import { createContext, useContext, useRef } from "react";

const initRaw = () => ({
  x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
  y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
});

/**
 * Path lessons publish calibrated head xy + viewport + universal-cursor visibility for GlobalEaseL.
 * `showUniversalCursor` remains available for future overrides, but current UX keeps one
 * universal cursor+trail visible across all phases for consistent orientation.
 */
const CursorPositionBridgeContext = createContext(null);

export function CursorPositionBridgeProvider({ children }) {
  const bridgeRef = useRef({
    raw: initRaw(),
    canvasViewport: null,
    showUniversalCursor: true,
    lessonPaused: false,
  });
  return (
    <CursorPositionBridgeContext.Provider value={bridgeRef}>
      {children}
    </CursorPositionBridgeContext.Provider>
  );
}

export function useCursorPositionBridgeRef() {
  return useContext(CursorPositionBridgeContext);
}
