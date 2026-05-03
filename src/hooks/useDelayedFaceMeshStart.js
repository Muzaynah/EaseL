import { useEffect } from "react";

/**
 * Waits before starting FaceMesh so React StrictMode does not wedge two
 * competing camera starts on the same video element (matches Calibration,
 * Tutorial, Screener, lessons).
 */
export function useDelayedFaceMeshStart(startFaceMesh, delayMs = 150) {
  useEffect(() => {
    let cleanup;
    const t = setTimeout(() => {
      cleanup = startFaceMesh();
    }, delayMs);
    return () => {
      clearTimeout(t);
      if (typeof cleanup === "function") cleanup();
    };
  }, [startFaceMesh, delayMs]);
}
