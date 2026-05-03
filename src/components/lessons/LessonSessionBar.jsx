/**
 * Instruction line + session mm:ss timer — shared lesson HUD strip.
 */
export default function LessonSessionBar({
  instruction,
  elapsedMs,
  className = "",
  instructionClassName = "text-lg font-bold sm:text-lg",
}) {
  return (
    <div className={`easeL-hud-bar flex items-center justify-between gap-3 rounded-xl px-4 py-2 shadow ${className}`}>
      <p className={`min-w-0 ${instructionClassName}`}>{instruction}</p>
      <span className="easeL-hud-bar-timer shrink-0">
        {Math.floor(elapsedMs / 60000)}:
        {String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, "0")}
      </span>
    </div>
  );
}
