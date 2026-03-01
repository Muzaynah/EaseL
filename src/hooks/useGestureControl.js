// hooks/useGestureControl.js
import { useRef, useCallback } from "react";

export function useGestureControl({
  onPenToggle,
  onButtonHover,
  onButtonClick,
  buttonRefs,
  /** When provided, use this ref for cursor position (keeps hit-test in sync with visual cursor). */
  cursorPosRef: externalCursorPosRef,
  /** Lower = more sensitive (e.g. 0.018 for screener). Default 0.03 */
  mouthOpenThreshold = 0.03,
  /** Fewer frames = quicker trigger (e.g. 1 for screener). Default 3 */
  framesToConfirm = 3,
  /** Cooldown between activations in ms. Default 300 */
  cooldownMs = 300,
}) {
  const internalCursorPos = useRef({ x: 800, y: 500 });
  const cursorPos = externalCursorPosRef ?? internalCursorPos;
  const lastToggleTime = useRef(0);
  const mouthOpenFrames = useRef(0);
  const mouthClosedFrames = useRef(0);
  const wasMouthOpen = useRef(false);

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

      // Mouth detection (threshold and frame count configurable for accessibility)
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
      const now = performance.now();

      // Trigger on mouth open (not close) with proper cooldown
      if (isMouthOpen && !wasMouthOpen.current && now - lastToggleTime.current > cooldownMs) {
        lastToggleTime.current = now;
        
        // If hovering over any interactive element, click it
        if (isOverInteractive) {
          if (hoveredElement) {
            dispatchPointerEvent("pointerdown", hoveredElement);
            dispatchPointerEvent("pointerup", hoveredElement);
            dispatchPointerEvent("click", hoveredElement);
            onButtonClick?.(hoveredBtn);
          } else if (elementAtCursor) {
            // Click the element under cursor
            dispatchPointerEvent("pointerdown", elementAtCursor);
            dispatchPointerEvent("pointerup", elementAtCursor);
            dispatchPointerEvent("click", elementAtCursor);
          }
        } else {
          // Not over an interactive element, toggle pen state
          onPenToggle?.(!isPenDown);
        }
      }
      
      // Update state for next frame
      if (isMouthOpen) {
        wasMouthOpen.current = true;
      } else if (isMouthClosed) {
        wasMouthOpen.current = false;
      }

      return { position: cursorPos.current, hoveredBtn };
    },
    [buttonRefs, onButtonHover, onPenToggle, onButtonClick, mouthOpenThreshold, framesToConfirm, cooldownMs]
  );

  return { cursorPos, processLandmarks };
}