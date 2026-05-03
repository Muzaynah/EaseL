import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import Cursor from "./Cursor";
import { useAuth } from "../context/AuthContext";
import { useCursorPositionBridgeRef } from "../context/CursorPositionBridgeContext";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useGestureControl } from "../hooks/useGestureControl";
import { resolveActivationConfig } from "../utils/activationConfig";

const HIDE_PREFIXES = ["/canvas", "/tutorial", "/screener"];

function shouldHideHeadNav(pathname) {
  return HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isLessonPathRoute(pathname) {
  return pathname.startsWith("/lesson-path");
}

const emptyButtonRefs = { current: {} };

function lessonUniversalPosition(lessonBridge, cursorPosRef, isLessonRoute) {
  if (isLessonRoute && lessonBridge?.current) {
    const raw = lessonBridge.current.raw ?? { x: 0, y: 0 };
    return { x: raw.x, y: raw.y };
  }
  const p = cursorPosRef.current || { x: 0, y: 0 };
  return { x: p.x, y: p.y };
}

function lessonShowsUniversalCursor(lessonBridge, isLessonRoute) {
  if (!isLessonRoute || !lessonBridge?.current) return true;
  return lessonBridge.current.showUniversalCursor !== false;
}

export default function GlobalEaseLCursor() {
  const { pathname } = useLocation();
  const hide = shouldHideHeadNav(pathname);
  const isLessonRoute = isLessonPathRoute(pathname);
  const lessonBridge = useCursorPositionBridgeRef();
  const { user, profile } = useAuth();
  /** Head cursor + global camera only after onboarding tutorial (signed-in returning users included). */
  const setupAllowsGlobalCursor = Boolean(user && profile?.tutorialPassed);
  const videoRef = useRef(null);
  const cursorElRef = useRef(null);

  const { cursorPosRef, updateCursorFromLandmarks } = useCalibratedCursor(profile);
  const activation = resolveActivationConfig(profile ?? {}, "canvas");

  const { processLandmarks } = useGestureControl({
    onPenToggle: () => {},
    onButtonHover: () => {},
    buttonRefs: emptyButtonRefs,
    cursorPosRef,
    activationMethod: activation.activationMethod,
    mouthOpenThreshold: activation.mouthOpenThreshold,
    framesToConfirm: activation.framesToConfirm,
    cooldownMs: activation.cooldownMs,
    dwellMs: activation.dwellMs,
    dwellRadius: activation.dwellRadius,
  });

  const handleFaceMeshResults = useCallback(
    (results) => {
      const landmarks = results?.multiFaceLandmarks?.[0];
      if (!landmarks) return;
      updateCursorFromLandmarks(landmarks);
      processLandmarks(landmarks, false);
    },
    [updateCursorFromLandmarks, processLandmarks]
  );

  const { startFaceMesh } = useFaceMesh({
    videoRef,
    onResults: handleFaceMeshResults,
  });

  const runGlobalFaceMesh = !hide && !isLessonRoute && setupAllowsGlobalCursor;

  useEffect(() => {
    if (!runGlobalFaceMesh) return undefined;
    let cleanup;
    const t = window.setTimeout(() => {
      cleanup = startFaceMesh();
    }, 160);
    return () => {
      window.clearTimeout(t);
      if (typeof cleanup === "function") cleanup();
    };
  }, [runGlobalFaceMesh, startFaceMesh]);

  useEffect(() => {
    if (hide || !setupAllowsGlobalCursor) return undefined;

    let raf;
    const tick = () => {
      const el = cursorElRef.current;
      const { x, y } = lessonUniversalPosition(
        lessonBridge,
        cursorPosRef,
        isLessonRoute
      );
      if (el) {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hide, setupAllowsGlobalCursor, cursorPosRef, isLessonRoute, lessonBridge]);

  if (hide) return null;
  if (!setupAllowsGlobalCursor) return null;

  const portalTarget =
    typeof document !== "undefined" ? document.body : null;

  const showUniversalCursor = lessonShowsUniversalCursor(lessonBridge, isLessonRoute);
  const initialCursorPosition = lessonUniversalPosition(
    lessonBridge,
    cursorPosRef,
    isLessonRoute
  );

  const cursorNode = showUniversalCursor ? (
    <Cursor
      ref={cursorElRef}
      variant="lesson"
      size={28}
      isPenDown={false}
      tool="brush"
      left={initialCursorPosition.x}
      top={initialCursorPosition.y}
    />
  ) : null;

  return (
    <>
      {runGlobalFaceMesh ? (
        <video
          ref={videoRef}
          className="easeL-camera-feed-offscreen"
          autoPlay
          muted
          playsInline
        />
      ) : null}
      {cursorNode && portalTarget
        ? createPortal(cursorNode, portalTarget)
        : cursorNode}
    </>
  );
}
