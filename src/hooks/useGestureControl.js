import { useRef, useCallback } from "react";

export function useGestureControl({
  onPositionUpdate,
  onPenToggle,
  onButtonHover,
  buttonRefs,
}) {
  const currentPos = useRef({ x: 800, y: 500 });
  const lastToggleTime = useRef(0);

  const processLandmarks = useCallback(
    (landmarks, isPenDown) => {
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

      let dx = 0;
      let dy = 0;

      if (Math.abs(yaw) > deadzone) {
        dx = (yaw - Math.sign(yaw) * deadzone) * sensitivity;
      }
      if (Math.abs(pitch) > deadzone) {
        dy = (pitch - Math.sign(pitch) * deadzone) * sensitivity;
      }

      currentPos.current.x -= dx * friction;
      currentPos.current.y += dy * friction;

      currentPos.current.x = Math.max(
        0,
        Math.min(window.innerWidth, currentPos.current.x)
      );
      currentPos.current.y = Math.max(
        0,
        Math.min(window.innerHeight, currentPos.current.y)
      );

      // Immediately update cursor using ref value
      onPositionUpdate?.({
        x: currentPos.current.x,
        y: currentPos.current.y,
      });

      // Hover detection
      let hovered = null;
      Object.keys(buttonRefs.current).forEach((id) => {
        const btn = buttonRefs.current[id];
        if (!btn) return;
        const b = btn.getBoundingClientRect();
        if (
          currentPos.current.x >= b.left &&
          currentPos.current.x <= b.right &&
          currentPos.current.y >= b.top &&
          currentPos.current.y <= b.bottom
        ) {
          hovered = id;
        }
      });

      onButtonHover?.(hovered);

      // Mouth toggle with time based cooldown
      const mouthHeight = Math.abs(landmarks[13].y - landmarks[14].y);
      const isMouthOpen = mouthHeight > 0.045;

      const now = performance.now();
      const cooldownMs = 600;

      if (isMouthOpen && now - lastToggleTime.current > cooldownMs) {
        if (hovered) {
          return {
            position: currentPos.current,
            hoveredBtn: hovered,
          };
        } else {
          onPenToggle?.(!isPenDown);
          lastToggleTime.current = now;
        }
      }

      return {
        position: currentPos.current,
        hoveredBtn: null,
      };
    },
    [buttonRefs, onButtonHover, onPenToggle, onPositionUpdate]
  );

  return { processLandmarks };
}
