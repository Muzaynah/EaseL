import TroubleshootAssist from "../TroubleshootAssist";

/**
 * Shared lesson chrome: centered card, header row, HUD timer strip, side camera,
 * main column for canvas + controls. Matches Path 2 layout for Path 1 + Path 2.
 */
export default function LessonShell({
  videoRef,
  headerBadge,
  caregiverControlsVisible,
  onRevealCaregiverTools,
  toolbar,
  showTroubleshoot = true,
  hudInstruction,
  elapsedMs,
  sidebarFooter = null,
  children,
}) {
  return (
    <div className="easeL-page-bg relative min-h-screen w-full overflow-x-hidden overflow-y-auto px-3 pb-6 pt-22 sm:px-4 md:px-5 md:pt-26">
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div
          className="rounded-3xl border-2 p-3 sm:p-4 md:p-5"
          style={{
            borderColor: "var(--easeL-border-strong)",
            background: "var(--easeL-bg-section)",
            boxShadow: "var(--easeL-cartoon-shadow)",
          }}
        >
          <div className="mb-2 flex w-full flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="easeL-hover-parent min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border-2 px-3 py-2 sm:px-3.5 sm:py-2.5"
              style={{
                background: "color-mix(in srgb, var(--easeL-bg-section) 92%, white)",
                borderColor: "var(--easeL-border-strong)",
              }}
            >
              {headerBadge}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <div
                className={`flex flex-wrap items-center gap-2 transition-opacity duration-300 ${
                  caregiverControlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onMouseEnter={onRevealCaregiverTools}
              >
                {showTroubleshoot ? <TroubleshootAssist /> : null}
                {toolbar}
              </div>
            </div>
          </div>

          <div className="mb-2 sm:mb-3">
            <div className="easeL-hud-bar flex min-h-[2.75rem] flex-col justify-center gap-1.5 px-3 py-2.5 sm:min-h-[3rem] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
              <p className="min-w-0 text-sm font-semibold leading-snug sm:text-base">{hudInstruction}</p>
              <span className="easeL-hud-bar-timer shrink-0 self-start sm:self-center">
                {Math.floor(elapsedMs / 60000)}:
                {String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="relative z-10 flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
            <aside className="order-first mx-auto flex w-full max-w-[280px] shrink-0 flex-col gap-3 sm:max-w-[min(100%,320px)] lg:order-none lg:mx-0 lg:w-[200px] xl:w-[228px]">
              <div
                className="overflow-hidden rounded-2xl border-2 bg-slate-900 shadow-md"
                style={{
                  borderColor: "var(--easeL-border-strong)",
                  boxShadow: "var(--easeL-cartoon-shadow-sm)",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full scale-x-[-1] object-cover"
                  style={{ aspectRatio: "4/3" }}
                />
              </div>
              {sidebarFooter}
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
