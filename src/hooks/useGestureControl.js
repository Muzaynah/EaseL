// hooks/useGestureControl.js
import { useRef, useCallback } from "react";

export function useGestureControl({
  onPenToggle,
  onButtonHover,
  onButtonClick,
  /** Called when user activates (mouth/dwell) but cursor is not over any registered button. */
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
  /** For activationMethod "dwell": ms cursor must stay within radius to trigger. Default 800 */
  dwellMs = 800,
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

  const dispatchPointerEvent = (type, target) => {
    if (!target) return;

    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: cursorPos.current.x,
        clientY: cursorPos.current.y,
        pointerType: "mouse",
      })
    );
  };

  const processLandmarks = useCallback(
    (landmarks, isPenDown) => {
      if (!landmarks)
        return { position: cursorPos.current, hoveredBtn: null };

      const nose = landmarks[1];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];

      const midX = (leftEar.x + rightEar.x) / 2;
      const midY = (leftEar.y + rightEar.y) / 2;

      const yaw = nose.x - midX;
      const pitch = (nose.y - midY) - 0.04;

      const deadzone = 0.015;
      const sensitivity = 80;
      const friction = 0.65;

      let dx =
        Math.abs(yaw) > deadzone
          ? (yaw - Math.sign(yaw) * deadzone) * sensitivity
          : 0;
      let dy =
        Math.abs(pitch) > deadzone
          ? (pitch - Math.sign(pitch) * deadzone) * sensitivity
          : 0;

      // Only update position when using internal ref; when external ref is passed, caller updates it.
      if (!externalCursorPosRef) {
        cursorPos.current.x -= dx * friction;
        cursorPos.current.y += dy * friction;
        cursorPos.current.x = Math.max(0, Math.min(window.innerWidth, cursorPos.current.x));
        cursorPos.current.y = Math.max(0, Math.min(window.innerHeight, cursorPos.current.y));
      }

      // Check for any interactive element at cursor position
      const elementAtCursor = document.elementFromPoint(
        cursorPos.current.x,
        cursorPos.current.y
      );

      // Check if hovering over a button in buttonRefs
      let hoveredBtn = null;
      let hoveredElement = null;
      
      Object.keys(buttonRefs.current).forEach((id) => {
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
      
      // Check if hovering over any clickable element (buttons, links, etc.)
      let isOverInteractive = false;
      if (elementAtCursor) {
        const tagName = elementAtCursor.tagName.toLowerCase();
        isOverInteractive = 
          tagName === 'button' || 
          tagName === 'a' || 
          elementAtCursor.onclick ||
          elementAtCursor.role === 'button' ||
          hoveredElement !== null;
        
        // Dispatch hover events to any interactive element
        if (isOverInteractive) {
          dispatchPointerEvent("pointerenter", elementAtCursor);
          dispatchPointerEvent("pointermove", elementAtCursor);
        }
      }
      
      onButtonHover?.(hoveredBtn);

      const now = performance.now();
      const useMouthActivation = activationMethod === "click" || activationMethod === "mouth" || !activationMethod;

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
          if (isOverInteractive && hoveredElement) {
            dispatchPointerEvent("pointerdown", hoveredElement);
            dispatchPointerEvent("pointerup", hoveredElement);
            dispatchPointerEvent("click", hoveredElement);
            onButtonClick?.(hoveredBtn);
          } else {
            if (!hoveredElement) onActivateOutside?.();
            if (isOverInteractive && elementAtCursor) {
              dispatchPointerEvent("pointerdown", elementAtCursor);
              dispatchPointerEvent("pointerup", elementAtCursor);
              dispatchPointerEvent("click", elementAtCursor);
            } else {
              onPenToggle?.(!isPenDown);
            }
          }
        }
        if (isMouthOpen) wasMouthOpen.current = true;
        else if (isMouthClosed) wasMouthOpen.current = false;
      } else if (activationMethod === "dwell") {
        const x = cursorPos.current.x;
        const y = cursorPos.current.y;
        const prev = dwellPosRef.current;
        const dist = prev
          ? Math.hypot(x - prev.x, y - prev.y)
          : dwellRadius + 1;
        if (dist <= dwellRadius) {
          if (dwellStartRef.current === null) dwellStartRef.current = now;
          if (now - dwellStartRef.current >= dwellMs && now - lastToggleTime.current > cooldownMs) {
            lastToggleTime.current = now;
            dwellStartRef.current = null;
            if (isOverInteractive && hoveredElement) {
              dispatchPointerEvent("pointerdown", hoveredElement);
              dispatchPointerEvent("pointerup", hoveredElement);
              dispatchPointerEvent("click", hoveredElement);
              onButtonClick?.(hoveredBtn);
            } else {
              if (!hoveredElement) onActivateOutside?.();
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
    [buttonRefs, onButtonHover, onPenToggle, onButtonClick, onActivateOutside, mouthOpenThreshold, framesToConfirm, cooldownMs, activationMethod, dwellMs, dwellRadius]
  );

  return { cursorPos, processLandmarks };
}