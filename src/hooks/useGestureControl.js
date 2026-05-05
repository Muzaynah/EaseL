// hooks/useGestureControl.js
import { useRef, useCallback, useEffect } from "react";
import { resolvePointerTarget } from "../utils/interactiveTarget";

export function useGestureControl({
  onPenToggle,
  onButtonHover,
  onButtonClick,
  /** Called with DOM element currently hovered by head pointer (or null). */
  onHoverTargetChange,
  /** Called when user activates (mouth/dwell) but cursor is not over any clickable target. */
  onActivateOutside,
  /** Fires for every mouth-open event even if it was rejected (for false-positive tracking). */
  onMouthEvent,
  buttonRefs,
  /** When provided, use this ref for cursor position (keeps hit-test in sync with visual cursor). */
  cursorPosRef: externalCursorPosRef,
  /**
   * "click" | "mouth" = mouth open triggers; "dwell" = cursor hold triggers.
   * Framework §3.4: dwell fallback is automatic when the profile sets
   * `useDwellActivation` or when the S3 false-positive rate crosses its
   * threshold. The caller should resolve that outside and pass the effective
   * method here.
   */
  activationMethod = "mouth",
  /** Lower = more sensitive (e.g. 0.018 for screener). Default 0.03 */
  mouthOpenThreshold = 0.03,
  /** Fewer frames = quicker trigger (e.g. 1 for screener). Default 3 */
  framesToConfirm = 3,
  /** Cooldown between activations in ms. Default 300 */
  cooldownMs = 300,
  /** For activationMethod "dwell": ms cursor must stay within radius to trigger. Default 3000 */
  dwellMs = 3000,
  /** For activationMethod "dwell": max px movement to count as "holding". Default 15 */
  dwellRadius = 15,
}) {
  const internalCursorPos = useRef({ x: 800, y: 500 });
  const cursorPos = externalCursorPosRef ?? internalCursorPos;
  const lastToggleTime = useRef(0);
  const mouthOpenFrames = useRef(0);
  const mouthClosedFrames = useRef(0);
  const wasMouthOpen = useRef(false);
  const dwellStartRef = useRef(null);
  const dwellPosRef = useRef(null);
  const lastHoverTargetRef = useRef(null);
  const lastHoverParentRef = useRef(null);

  const dispatchPointerEvent = useCallback((type, target) => {
    if (!target) return;

    const { x, y } = cursorPos.current;
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerType: "mouse",
        pointerId: 1,
        isPrimary: true,
        width: 1,
        height: 1,
        pressure: 0,
        tiltX: 0,
        tiltY: 0,
      })
    );
    /* CSS :hover follows mouse events in some engines; keep parity with real cursor */
    const mouseMap = {
      pointerover: "mouseover",
      pointerenter: "mouseenter",
      pointerout: "mouseout",
      pointerleave: "mouseleave",
    };
    const mouseType = mouseMap[type];
    if (mouseType) {
      target.dispatchEvent(
        new MouseEvent(mouseType, {
          bubbles: mouseType !== "mouseenter" && mouseType !== "mouseleave",
          cancelable: true,
          clientX: x,
          clientY: y,
        })
      );
    }
  }, []);

  const updateHeadHoverTarget = useCallback(
    (nextTargetRaw) => {
      const nextTarget =
        nextTargetRaw &&
        nextTargetRaw !== document.body &&
        nextTargetRaw !== document.documentElement
          ? nextTargetRaw
          : null;
      const prev = lastHoverTargetRef.current;
      const prevParent = lastHoverParentRef.current;
      const nextParent = nextTarget?.closest?.(".easeL-hover-parent") ?? null;

      if (prev === nextTarget) {
        if (nextTarget) dispatchPointerEvent("pointermove", nextTarget);
        if (nextParent?.isConnected) nextParent.setAttribute("data-easel-head-hover", "true");
        onHoverTargetChange?.(nextTarget ?? null);
        return;
      }

      if (prev?.isConnected) {
        prev.removeAttribute("data-easel-head-hover");
        dispatchPointerEvent("pointerout", prev);
        dispatchPointerEvent("pointerleave", prev);
      }
      if (prevParent?.isConnected && prevParent !== nextParent) {
        prevParent.removeAttribute("data-easel-head-hover");
      }

      if (nextTarget?.isConnected) {
        nextTarget.setAttribute("data-easel-head-hover", "true");
        dispatchPointerEvent("pointerover", nextTarget);
        dispatchPointerEvent("pointerenter", nextTarget);
        dispatchPointerEvent("pointermove", nextTarget);
      }
      if (nextParent?.isConnected && nextParent !== nextTarget) {
        nextParent.setAttribute("data-easel-head-hover", "true");
      }

      lastHoverTargetRef.current = nextTarget ?? null;
      lastHoverParentRef.current = nextParent;
      onHoverTargetChange?.(nextTarget ?? null);
    },
    [dispatchPointerEvent, onHoverTargetChange]
  );

  useEffect(() => {
    return () => {
      const prev = lastHoverTargetRef.current;
      if (prev?.isConnected) prev.removeAttribute("data-easel-head-hover");
      const prevParent = lastHoverParentRef.current;
      if (prevParent?.isConnected) prevParent.removeAttribute("data-easel-head-hover");
      lastHoverTargetRef.current = null;
      lastHoverParentRef.current = null;
    };
  }, []);

  const processLandmarks = useCallback(
    (landmarks, isPenDown) => {
      if (!landmarks) return { position: cursorPos.current, hoveredBtn: null };

      const nose = landmarks[1];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];

      const midX = (leftEar.x + rightEar.x) / 2;
      const midY = (leftEar.y + rightEar.y) / 2;

      const yaw = nose.x - midX;
      const pitch = nose.y - midY - 0.04;

      const deadzone = 0.015;
      const sensitivity = 80;
      const friction = 0.65;

      const dx =
        Math.abs(yaw) > deadzone ? (yaw - Math.sign(yaw) * deadzone) * sensitivity : 0;
      const dy =
        Math.abs(pitch) > deadzone ? (pitch - Math.sign(pitch) * deadzone) * sensitivity : 0;

      if (!externalCursorPosRef) {
        cursorPos.current.x -= dx * friction;
        cursorPos.current.y += dy * friction;
        cursorPos.current.x = Math.max(0, Math.min(window.innerWidth, cursorPos.current.x));
        cursorPos.current.y = Math.max(0, Math.min(window.innerHeight, cursorPos.current.y));
      }

      const rawAtCursor = document.elementFromPoint(cursorPos.current.x, cursorPos.current.y);

      /** Registered hotspots (canvas, screeners): take priority over DOM hit-test */
      let hoveredBtn = null;
      let hoveredElement = null;

      Object.keys(buttonRefs.current || {}).forEach((id) => {
        const btn = buttonRefs.current[id];
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        if (
          cursorPos.current.x >= rect.left &&
          cursorPos.current.x <= rect.right &&
          cursorPos.current.y >= rect.top &&
          cursorPos.current.y <= rect.bottom
        ) {
          hoveredBtn = id;
          hoveredElement = btn;
        }
      });

      const domClickTarget = resolvePointerTarget(rawAtCursor);

      /** Primary activation target — registered refs first (legacy), else any accessible control */
      const primaryClickTarget = hoveredElement ?? domClickTarget;

      onButtonHover?.(hoveredBtn);
      // Hover visuals should follow what the head cursor is physically over
      // (cards/containers/areas), not only the resolved clickable control.
      updateHeadHoverTarget(rawAtCursor ?? primaryClickTarget);

      const now = performance.now();
      const useMouthActivation =
        activationMethod === "click" ||
        activationMethod === "mouth" ||
        !activationMethod;

      if (useMouthActivation) {
        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        const mouthHeight = Math.abs(upperLip.y - lowerLip.y);
        const isMouthCurrentlyOpen = mouthHeight > mouthOpenThreshold;

        if (isMouthCurrentlyOpen) {
          mouthOpenFrames.current++;
          mouthClosedFrames.current = 0;
        } else {
          mouthClosedFrames.current++;
          mouthOpenFrames.current = 0;
        }

        const isMouthOpen = mouthOpenFrames.current >= framesToConfirm;
        const isMouthClosed = mouthClosedFrames.current >= framesToConfirm;

        if (isMouthOpen && !wasMouthOpen.current) {
          const accepted = now - lastToggleTime.current > cooldownMs;
          onMouthEvent?.({ accepted, ts: now });
          if (!accepted) {
            wasMouthOpen.current = true;
            return { position: cursorPos.current, hoveredBtn };
          }
          lastToggleTime.current = now;

          if (primaryClickTarget) {
            dispatchPointerEvent("pointerdown", primaryClickTarget);
            dispatchPointerEvent("pointerup", primaryClickTarget);
            dispatchPointerEvent("click", primaryClickTarget);
            onButtonClick?.(hoveredBtn);
          } else {
            onActivateOutside?.();
            onPenToggle?.(!isPenDown);
          }
        }

        if (isMouthOpen) wasMouthOpen.current = true;
        else if (isMouthClosed) wasMouthOpen.current = false;
      } else if (activationMethod === "dwell") {
        const x = cursorPos.current.x;
        const y = cursorPos.current.y;
        const prev = dwellPosRef.current;
        const dist = prev ? Math.hypot(x - prev.x, y - prev.y) : dwellRadius + 1;
        if (dist <= dwellRadius) {
          if (dwellStartRef.current === null) dwellStartRef.current = now;
          if (
            now - dwellStartRef.current >= dwellMs &&
            now - lastToggleTime.current > cooldownMs
          ) {
            lastToggleTime.current = now;
            dwellStartRef.current = null;
            const domT = resolvePointerTarget(
              document.elementFromPoint(cursorPos.current.x, cursorPos.current.y)
            );
            const primary = hoveredElement ?? domT;

            if (primary) {
              dispatchPointerEvent("pointerdown", primary);
              dispatchPointerEvent("pointerup", primary);
              dispatchPointerEvent("click", primary);
              onButtonClick?.(hoveredBtn);
            } else {
              onActivateOutside?.();
              onPenToggle?.(!isPenDown);
            }
          }
        } else {
          dwellStartRef.current = null;
        }
        dwellPosRef.current = { x, y };
      }

      return { position: cursorPos.current, hoveredBtn };
    },
    [
      buttonRefs,
      onButtonHover,
      onPenToggle,
      onButtonClick,
      onActivateOutside,
      onMouthEvent,
      mouthOpenThreshold,
      framesToConfirm,
      cooldownMs,
      activationMethod,
      dwellMs,
      dwellRadius,
      dispatchPointerEvent,
      updateHeadHoverTarget,
    ]
  );

  return { cursorPos, processLandmarks };
}
