export function generateCorridor(
  type,
  width,
  length,
  canvasWidth,
  canvasHeight
) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  if (type === "straight") {
    return {
      type: "straight",
      start: { x: centerX - length / 2, y: centerY },
      end: { x: centerX + length / 2, y: centerY },
      width,
      centerline: [
        { x: centerX - length / 2, y: centerY },
        { x: centerX + length / 2, y: centerY },
      ],
    };
  }

  if (type === "gentle-curve") {
    const centerline = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = centerX - length / 2 + t * length;
      const y = centerY + Math.sin(t * Math.PI) * 80;
      centerline.push({ x, y });
    }
    return {
      type: "gentle-curve",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
    };
  }

  if (type === "complex-curve") {
    const centerline = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = centerX - length / 2 + t * length;
      const y = centerY + Math.sin(t * Math.PI * 2) * 60;
      centerline.push({ x, y });
    }
    return {
      type: "complex-curve",
      start: centerline[0],
      end: centerline[centerline.length - 1],
      width,
      centerline,
    };
  }

  return null;
}

export function isPointInCorridor(point, corridor) {
  if (!corridor?.centerline?.length) return false;
  let minDist = Infinity;
  for (const centerPoint of corridor.centerline) {
    const dist = Math.sqrt(
      Math.pow(point.x - centerPoint.x, 2) +
        Math.pow(point.y - centerPoint.y, 2)
    );
    if (dist < minDist) minDist = dist;
  }
  return minDist <= corridor.width / 2;
}

export function calculateAdherence(userPath, corridor) {
  if (!userPath?.length || !corridor) return 0;
  const pointsInside = userPath.filter((p) =>
    isPointInCorridor(p, corridor)
  ).length;
  return Math.round((pointsInside / userPath.length) * 100); // 0–100 integer, 0 decimals
}
