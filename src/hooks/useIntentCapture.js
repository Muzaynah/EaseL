import { useRef, useCallback } from "react";
import { UI_TOKENS } from "../theme/uiTokens";

export function useIntentCapture({
  tiltAngle,
  autocompleteLevel,
  onStrokeComplete,
}) {
  const directionBufferRef = useRef([]);

  const detectDirection = useCallback(() => {
    const angle = tiltAngle;
    let direction = "none";

    if (angle >= -22.5 && angle < 22.5) direction = "right";
    else if (angle >= 22.5 && angle < 67.5) direction = "down-right";
    else if (angle >= 67.5 && angle < 112.5) direction = "down";
    else if (angle >= 112.5 && angle < 157.5) direction = "down-left";
    else if (angle >= 157.5 || angle < -157.5) direction = "left";
    else if (angle >= -157.5 && angle < -112.5) direction = "up-left";
    else if (angle >= -112.5 && angle < -67.5) direction = "up";
    else if (angle >= -67.5 && angle < -22.5) direction = "up-right";

    directionBufferRef.current.push(direction);
    if (directionBufferRef.current.length > 10) {
      directionBufferRef.current.shift();
    }

    const counts = {};
    directionBufferRef.current.forEach((d) => {
      counts[d] = (counts[d] || 0) + 1;
    });

    const stableDirection = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b
    );

    if (
      directionBufferRef.current.length > 0 &&
      counts[stableDirection] / directionBufferRef.current.length >= 0.7 &&
      stableDirection !== "none"
    ) {
      return stableDirection;
    }
    return null;
  }, [tiltAngle]);

  const executeStroke = useCallback(
    (ctx, startPos, direction) => {
      if (!direction || direction === "none") return null;

      const baseDistance = 200;
      const strokeDistance = baseDistance * (autocompleteLevel / 100);

      const vectors = {
        right: { x: 1, y: 0 },
        "down-right": { x: 0.707, y: 0.707 },
        down: { x: 0, y: 1 },
        "down-left": { x: -0.707, y: 0.707 },
        left: { x: -1, y: 0 },
        "up-left": { x: -0.707, y: -0.707 },
        up: { x: 0, y: -1 },
        "up-right": { x: 0.707, y: -0.707 },
      };

      const vector = vectors[direction];
      if (!vector) return null;

      const endPos = {
        x: startPos.x + vector.x * strokeDistance,
        y: startPos.y + vector.y * strokeDistance,
      };

      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      const controlPoint = {
        x: startPos.x + vector.x * strokeDistance * 0.5,
        y: startPos.y + vector.y * strokeDistance * 0.5,
      };
      ctx.quadraticCurveTo(
        controlPoint.x,
        controlPoint.y,
        endPos.x,
        endPos.y
      );
      ctx.strokeStyle = UI_TOKENS.lesson.tracePrimary;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();

      onStrokeComplete?.({ direction, endPos });
      return endPos;
    },
    [autocompleteLevel, onStrokeComplete]
  );

  return { detectDirection, executeStroke };
}
