import { useCallback } from "react";

export function usePath2InputCageController({
  phaseRef,
  isDrawingRef,
  currentSegmentRef,
  corridorRef,
  segmentsFor,
  cursorPosRef,
  displayCursorRef,
  canvasToScreen,
  freezeRecalibrationRef,
  setIsDrawing,
  setInstructionDismiss,
  userPathRef,
  wobbleIndicesRef,
  maxProjIdxRef,
  guideIdxRef,
  startTsRef,
  lastAdherenceSampleRef,
  debugSamplesRef,
  canceledStrokeRef,
  segmentStartLockUntilRef,
  lastHeadCanvasPosRef,
  stallFramesRef,
  reachedHalfwayRef,
  railVertexDistRef,
  lessonCagePadding,
  canvasWidth,
  canvasHeight,
  visualCorridorScale,
  startLockMs,
}) {
  const snapCursorToCanvasPoint = useCallback(
    (cx, cy) => {
      const screen = canvasToScreen(cx, cy);
      if (cursorPosRef?.current) {
        cursorPosRef.current.x = screen.x;
        cursorPosRef.current.y = screen.y;
      }
      displayCursorRef.current.x = screen.x;
      displayCursorRef.current.y = screen.y;
    },
    [canvasToScreen, cursorPosRef, displayCursorRef],
  );

  const getLessonCageBounds = useCallback(() => {
    const c = corridorRef.current;
    const seg = currentSegmentRef.current;
    const pts = seg?.centerline?.length ? seg.centerline : c?.centerline;
    const corridorWidth = (c?.width ?? 120) * visualCorridorScale;
    if (!pts?.length) {
      return {
        left: lessonCagePadding,
        top: lessonCagePadding,
        right: canvasWidth - lessonCagePadding,
        bottom: canvasHeight - lessonCagePadding,
      };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = Math.max(lessonCagePadding, corridorWidth * 0.7);
    return {
      left: Math.max(0, minX - pad),
      top: Math.max(0, minY - pad),
      right: Math.min(canvasWidth, maxX + pad),
      bottom: Math.min(canvasHeight, maxY + pad),
    };
  }, [
    corridorRef,
    currentSegmentRef,
    visualCorridorScale,
    lessonCagePadding,
    canvasWidth,
    canvasHeight,
  ]);

  const cancelCurrentStroke = useCallback(() => {
    if (phaseRef.current !== "trial" || !isDrawingRef.current) return;
    const seg = currentSegmentRef.current;
    if (seg?.centerline?.length) {
      canceledStrokeRef.current = {
        centerline: seg.centerline,
        upto: maxProjIdxRef.current ?? 0,
        ts: performance.now(),
      };
    }
    isDrawingRef.current = false;
    if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
    setIsDrawing(false);
    userPathRef.current = seg?.start ? [{ x: seg.start.x, y: seg.start.y }] : [];
    wobbleIndicesRef.current = [];
    maxProjIdxRef.current = 0;
    guideIdxRef.current = 0;
    startTsRef.current = null;
    debugSamplesRef.current = [];
    stallFramesRef.current = 0;
    lastHeadCanvasPosRef.current = null;
    reachedHalfwayRef.current = false;
    railVertexDistRef.current = null;
  }, [
    phaseRef,
    isDrawingRef,
    currentSegmentRef,
    canceledStrokeRef,
    maxProjIdxRef,
    freezeRecalibrationRef,
    setIsDrawing,
    userPathRef,
    wobbleIndicesRef,
    guideIdxRef,
    startTsRef,
    debugSamplesRef,
    stallFramesRef,
    lastHeadCanvasPosRef,
    reachedHalfwayRef,
    railVertexDistRef,
  ]);

  const startDrawingSegment = useCallback(() => {
    if (phaseRef.current !== "trial") return;
    if (isDrawingRef.current) return;
    const seg = currentSegmentRef.current;
    isDrawingRef.current = true;
    if (freezeRecalibrationRef) freezeRecalibrationRef.current = true;
    setIsDrawing(true);
    setInstructionDismiss((n) => n + 1);
    userPathRef.current = seg?.start ? [{ x: seg.start.x, y: seg.start.y }] : [];
    wobbleIndicesRef.current = [];
    maxProjIdxRef.current = 0;
    guideIdxRef.current = 0;
    startTsRef.current = Date.now();
    lastAdherenceSampleRef.current = {
      x: seg?.start?.x ?? null,
      y: seg?.start?.y ?? null,
      ts: performance.now(),
    };
    debugSamplesRef.current = [];
    canceledStrokeRef.current = null;
    if (seg?.start) snapCursorToCanvasPoint(seg.start.x, seg.start.y);
    segmentStartLockUntilRef.current = performance.now() + startLockMs;
    lastHeadCanvasPosRef.current = seg?.start ? { x: seg.start.x, y: seg.start.y } : null;
    stallFramesRef.current = 0;
    reachedHalfwayRef.current = false;
  }, [
    phaseRef,
    isDrawingRef,
    currentSegmentRef,
    freezeRecalibrationRef,
    setIsDrawing,
    setInstructionDismiss,
    userPathRef,
    wobbleIndicesRef,
    maxProjIdxRef,
    guideIdxRef,
    startTsRef,
    lastAdherenceSampleRef,
    debugSamplesRef,
    canceledStrokeRef,
    snapCursorToCanvasPoint,
    segmentStartLockUntilRef,
    startLockMs,
    lastHeadCanvasPosRef,
    stallFramesRef,
    reachedHalfwayRef,
  ]);

  const beginTrial = useCallback(
    (recenter, setPhase) => {
      if (phaseRef.current !== "demo") return;
      const c = corridorRef.current;
      const segs = segmentsFor(c);
      const firstSeg = segs[0];
      if (firstSeg?.start) {
        snapCursorToCanvasPoint(firstSeg.start.x, firstSeg.start.y);
      } else {
        recenter();
      }
      setPhase("trial");
    },
    [phaseRef, corridorRef, segmentsFor, snapCursorToCanvasPoint],
  );

  return {
    snapCursorToCanvasPoint,
    getLessonCageBounds,
    cancelCurrentStroke,
    startDrawingSegment,
    beginTrial,
  };
}
