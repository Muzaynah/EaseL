import { useRef, useCallback } from "react";

export function useGestureControl({
  onPenToggle,
  onButtonHover,
  buttonRefs,
}) {
  const cursorPos = useRef({ x: 800, y: 500 });
  const lastToggleTime = useRef(0);

  const processLandmarks = useCallback(
    (landmarks, isPenDown) => {
      if (!landmarks) return { position: cursorPos.current, hoveredBtn: null };

      /* ================= HEAD POSITION ================= */
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

      let dx = Math.abs(yaw) > deadzone ? (yaw - Math.sign(yaw) * deadzone) * sensitivity : 0;
      let dy = Math.abs(pitch) > deadzone ? (pitch - Math.sign(pitch) * deadzone) * sensitivity : 0;

      cursorPos.current.x -= dx * friction;
      cursorPos.current.y += dy * friction;

      cursorPos.current.x = Math.max(0, Math.min(window.innerWidth, cursorPos.current.x));
      cursorPos.current.y = Math.max(0, Math.min(window.innerHeight, cursorPos.current.y));

      /* ================= BUTTON HOVER ================= */
      let hoveredBtn = null;
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
        }
      });
      onButtonHover?.(hoveredBtn);

      /* ================= MOUTH → PEN TOGGLE ================= */
      const mouthHeight = Math.abs(landmarks[13].y - landmarks[14].y);
      const isMouthOpen = mouthHeight > 0.045;
      const now = performance.now();
      const cooldownMs = 600;

      if (isMouthOpen && now - lastToggleTime.current > cooldownMs && !hoveredBtn) {
        onPenToggle?.(!isPenDown);
        lastToggleTime.current = now;
      }

      return { position: cursorPos.current, hoveredBtn };
    },
    [buttonRefs, onButtonHover, onPenToggle]
  );

  return { cursorPos, processLandmarks };
}
