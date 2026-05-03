/**
 * Fixed-position smoothed cursor marker used on lesson routes (Path 1 + Path 2).
 */
export default function LessonRailDot({ railDotRef }) {
  return (
    <div
      ref={railDotRef}
      aria-hidden
      className="fixed pointer-events-none z-[850] rounded-full border-2 border-white/75 bg-white/35 shadow-md"
      style={{
        width: 12,
        height: 12,
        transform: "translate(-50%, -50%)",
        left: "50%",
        top: "40%",
        visibility: "hidden",
      }}
    />
  );
}
