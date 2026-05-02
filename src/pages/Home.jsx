import { Link } from "react-router-dom";
import { BookOpen, Play, BarChart3 } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { getTrialLog, getSessionLog } from "../utils/persistence";
import {
  getStage,
  firstStageForMode,
  lastStageForMode,
} from "../utils/lessonContent";
import imgSlimeGreen from "../assets/images/—Pngtree—pastel green slime kawaii icon_23260223.png";
import imgSlimeBlue from "../assets/images/cute blue slime kawaii character_23260227.png";
import imgCloudCute from "../assets/images/weather-cloud-cute_51867178.png";

const MS_PER_HOUR = 1000 * 60 * 60;

/** Drop a PNG in `public/mascots/easel-shortcuts.png` to show a mascot beside Shortcuts; omitted safely if missing. */
const SHORTCUTS_SECTION_MASCOT_SRC = `${import.meta.env.BASE_URL}mascots/easel-shortcuts.png`;

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Prefer a real name; never show a raw email in the greeting. */
function deriveWelcomeFirstName(user, profile) {
  const name = (profile?.name || user?.name || "").trim();
  if (name && !name.includes("@")) {
    const first = name.split(/\s+/)[0].replace(/[^a-zA-ZÀ-ÿ'-]/g, "");
    if (first)
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  const email = (user?.email || profile?.email || "").trim();
  if (email.includes("@")) {
    const local = email.split("@")[0];
    const word =
      local.replace(/\d+$/u, "").split(/[._-]/u)[0] ||
      local.replace(/\d+$/u, "") ||
      local;
    if (word)
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return "there";
}

/**
 * Mode-aware Home per framework §8.2.
 *   Mode 1 (Intent Capture): a single large "Start lesson" target. Caregiver controls
 *   live in the navbar avatar. No side trips to canvas/gallery/settings.
 *   Mode 2 (Guided Control): structured dashboard with Lessons as the primary CTA,
 *   Gallery/Free draw as secondary, profile summary derived from stored state.
 */
export default function Home({ user }) {
  const { profile, effectivePathId } = useAppState();
  const welcomeFirstName = deriveWelcomeFirstName(user, profile);
  const pathId = effectivePathId ?? profile?.pathId ?? profile?.lipMode ?? null;

  if (pathId === 1) {
    return <Mode1Home welcomeFirstName={welcomeFirstName} />;
  }
  return <Mode2Home welcomeFirstName={welcomeFirstName} profile={profile} />;
}

function getPathLevelLabel(profile) {
  const pathId = profile?.pathId ?? profile?.lipMode ?? null;
  const pathLevel =
    profile?.pathLevel ??
    (pathId === 1
      ? profile?.lipTier === 1
        ? 1
        : 2
      : pathId === 2
      ? profile?.lipTier === 3
        ? 1
        : 2
      : null);
  if (pathId === 1) return `Path 1 - Level ${pathLevel ?? 1}`;
  if (pathId === 2) return `Path 2 - Level ${pathLevel ?? 1}`;
  return "Not assigned";
}

function Mode1Home({ welcomeFirstName }) {
  return (
    <div
      className="easeL-page-bg flex min-h-screen flex-col items-center justify-center px-3 pb-20 pt-24 sm:px-4"
    >
      <div className="w-full min-w-0 max-w-xl text-center">
        <p className="mb-3 text-2xl" style={{ color: "var(--easeL-text-muted)" }}>
          Hi, {welcomeFirstName}!
        </p>
        <h1
          className="mb-10 text-3xl font-extrabold md:text-4xl"
          style={{ color: "var(--easeL-text)" }}
        >
          Ready to practise?
        </h1>
        <Link
          to="/lesson-path1"
          className="group flex w-full max-w-full flex-col items-center gap-6 rounded-[2rem] p-8 text-white shadow-2xl transition-transform hover:scale-[1.02] active:scale-[0.99] sm:rounded-[2.5rem] sm:p-10 md:p-12"
          style={{ background: "var(--easeL-primary)", boxShadow: "var(--easeL-shadow-soft)" }}
          aria-label="Start today's lesson"
        >
          <span
            className="flex h-28 w-28 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, white 22%, transparent)" }}
          >
            <Play className="h-16 w-16 fill-white" strokeWidth={0} />
          </span>
          <span className="text-4xl font-extrabold tracking-tight md:text-5xl">Start lesson</span>
        </Link>
        <p className="mt-8 text-lg" style={{ color: "var(--easeL-text-muted)" }}>
          Caregiver: use the button top right (your initial) for profile, settings, and progress.
        </p>
      </div>
    </div>
  );
}

function Mode2Home({ welcomeFirstName, profile }) {
  const trialLog = typeof window !== "undefined" ? getTrialLog() : [];
  const sessionLog = typeof window !== "undefined" ? getSessionLog() : [];

  const completedLessons = trialLog.filter((t) => t.success).length;
  const totalSessions = sessionLog.length;
  const totalPracticeMs = sessionLog.reduce((a, s) => a + (s.durationMs || 0), 0);
  const practiceHours = (totalPracticeMs / MS_PER_HOUR).toFixed(1);
  // Mode 2 users live in stages 3-6; floor defensively so any stale value
  // displays sensibly (matches the LessonSelect auto-heal).
  const rawStage = profile?.currentLevel ?? profile?.currentStage ?? firstStageForMode(2);
  const currentStage = Math.max(
    firstStageForMode(2),
    Math.min(lastStageForMode(2), rawStage),
  );
  const currentStageDef = getStage(currentStage);
  const pathLevel = getPathLevelLabel(profile);

  const quickActions = [
    {
      title: "Free Draw",
      description: "Open canvas for free practice (optional).",
      buttonText: "Open Canvas",
      path: "/canvas",
      tone: "ash",
      mascot: imgSlimeBlue,
    },
    {
      title: "Guided Lessons",
      description: "Corridor tracing with scaffolded assistance.",
      buttonText: "Open Lessons",
      path: "/lessons",
      tone: "lavender",
      mascot: imgSlimeGreen,
    },
    {
      title: "My Gallery",
      description: "Saved drawings you created.",
      buttonText: "View Gallery",
      path: "/gallery",
      tone: "coral",
      mascot: imgCloudCute,
    },
  ];

  const summary = [
    {
      label: "Learning path",
      value: pathLevel,
    },
    {
      label: "Current level",
      value: `Level ${currentStage} · ${currentStageDef?.title ?? ""}`,
    },
    { label: "Sessions logged", value: `${totalSessions}` },
    { label: "Lesson attempts passed", value: `${completedLessons}` },
    { label: "Practice time", value: `${practiceHours} h` },
    {
      label: "Last calibrated",
      value: formatDate(profile?.calibration?.lastCalibratedAt),
    },
  ];

  return (
    <div className="easeL-page-bg min-h-screen px-3 pb-16 pt-24 sm:px-5 md:px-6 md:pt-28">
      <div className="mx-auto max-w-6xl min-w-0 space-y-10 sm:space-y-12">
        <section className="min-w-0">
            <div
              className="easeL-card flex min-w-0 flex-col gap-3 border-2 p-4 sm:p-5 md:flex-row md:items-center md:justify-between md:p-6"
              style={{ borderColor: "var(--easeL-border-strong)", background: "var(--easeL-bg-section)" }}
            >
              <div className="min-w-0">
                <h1 className="easeL-heading-1 text-balance">
                  Hi, {welcomeFirstName}!
                </h1>
                <p className="mt-1 text-base" style={{ color: "var(--easeL-text-muted)" }}>
                  Path 2 · guided control · level {currentStage} ·{" "}
                  <span className="font-semibold" style={{ color: "var(--easeL-primary)" }}>
                    {currentStageDef?.title ?? "—"}
                  </span>
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
                <Link
                  to="/progress"
                  className="easeL-interactive inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border-2 bg-white px-5 text-[0.95rem] font-semibold sm:w-auto"
                  style={{ borderColor: "var(--easeL-border)", color: "var(--easeL-text)" }}
                >
                  <BarChart3 className="h-5 w-5" style={{ color: "var(--easeL-primary)" }} />
                  Progress
                </Link>
                <Link
                  to="/lessons"
                  className="easeL-btn-solid min-h-12 w-full min-w-0 justify-center px-7 text-[1rem] font-semibold sm:w-auto"
                  style={{ background: "var(--easeL-primary)" }}
                >
                  <BookOpen className="h-5 w-5" />
                  Continue path
                </Link>
              </div>
            </div>
        </section>

        <section className="min-w-0">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="easeL-heading-2 shrink-0">Shortcuts</h2>
            <figure
              className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0 sm:h-32 sm:w-32"
              aria-hidden
            >
              <img
                src={SHORTCUTS_SECTION_MASCOT_SRC}
                alt=""
                className="h-full w-full object-contain object-bottom"
                onError={(e) => {
                  e.currentTarget.closest("figure")?.style.setProperty("display", "none");
                }}
              />
            </figure>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
            {quickActions.map((action) => {
              const toneStyles =
                action.tone === "coral"
                  ? {
                      cardBg: "var(--easeL-bg-card-coral)",
                      borderColor:
                        "color-mix(in srgb, var(--easeL-accent-coral) 38%, var(--easeL-ink) 62%)",
                      accentLine: "var(--easeL-accent-coral)",
                      ctaBorder:
                        "color-mix(in srgb, var(--easeL-accent-coral) 52%, var(--easeL-ink) 48%)",
                    }
                  : action.tone === "ash"
                  ? {
                      cardBg: "var(--easeL-bg-card-mint)",
                      borderColor:
                        "color-mix(in srgb, var(--easeL-accent-mint) 35%, var(--easeL-ink) 65%)",
                      accentLine: "var(--easeL-accent-mint)",
                      ctaBorder:
                        "color-mix(in srgb, var(--easeL-accent-mint) 48%, var(--easeL-ink) 52%)",
                    }
                  : {
                      cardBg: "var(--easeL-bg-card-butter)",
                      borderColor:
                        "color-mix(in srgb, var(--easeL-primary) 40%, var(--easeL-ink) 60%)",
                      accentLine: "var(--easeL-primary-light)",
                      ctaBorder:
                        "color-mix(in srgb, var(--easeL-primary) 48%, var(--easeL-ink) 52%)",
                    };

              const isLessonsMascot = action.path === "/lessons";
              const isFreeDrawBlue = action.mascot === imgSlimeBlue;
              const mascotImgSize = isLessonsMascot
                ? { w: 108, h: 108 }
                : isFreeDrawBlue
                ? { w: 124, h: 124 }
                : { w: 132, h: 132 };
              const mascotSizeClass = isLessonsMascot
                ? "easeL-home-shortcut-mascot--compact h-[5.5rem] max-h-[5.5rem] w-auto sm:h-[6.35rem] sm:max-h-[6.35rem]"
                : isFreeDrawBlue
                ? "easeL-home-shortcut-mascot--compact h-[6.35rem] max-h-[6.35rem] w-auto sm:h-[7.25rem] sm:max-h-[7.25rem]"
                : "easeL-home-shortcut-mascot--hero-cloud h-[7rem] max-h-[7rem] w-auto max-w-[min(100%,10.5rem)] sm:h-[8rem] sm:max-h-[8rem] sm:max-w-[11.5rem]";

              return (
                <div
                  key={action.title}
                  className="easeL-home-shortcut-card easeL-hoverable-card flex min-h-[13.5rem] min-w-0 flex-col rounded-3xl border-[3px] px-5 py-5 sm:min-h-[14.5rem] sm:px-6 sm:py-6"
                  style={{
                    borderColor: toneStyles.borderColor,
                    background: toneStyles.cardBg,
                    ["--easeL-card-accent-inset"]: toneStyles.accentLine,
                  }}
                >
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center pb-3 sm:pb-4">
                    <div className="flex flex-row items-center gap-2.5 sm:gap-3">
                      <div className="min-w-0 flex-1 basis-0 pr-0.5 sm:pr-1">
                        <h3 className="easeL-heading-3 text-pretty" style={{ color: "var(--easeL-ink)" }}>
                          {action.title}
                        </h3>
                        <p
                          className="mt-1.5 text-[0.98rem] font-medium leading-relaxed sm:mt-2"
                          style={{ color: "var(--easeL-text)" }}
                        >
                          {action.description}
                        </p>
                      </div>
                      {action.mascot ? (
                        <div
                          className={`flex shrink-0 items-center justify-center self-center pl-0.5 ${
                            isFreeDrawBlue ? "mb-1 sm:mb-1.5" : ""
                          }`}
                        >
                          <img
                            src={action.mascot}
                            alt=""
                            width={mascotImgSize.w}
                            height={mascotImgSize.h}
                            className={`easeL-home-shortcut-mascot pointer-events-none block shrink-0 select-none object-contain object-center ${mascotSizeClass}${
                              action.path === "/gallery" ? " easeL-home-shortcut-mascot--thin-outline" : ""
                            }`}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    to={action.path}
                    className="easeL-home-shortcut-cta mt-5 w-full shrink-0"
                    style={{
                      ["--easeL-home-shortcut-cta-border"]: toneStyles.ctaBorder,
                      ["--easeL-home-shortcut-cta-fg"]: "var(--easeL-ink)",
                    }}
                  >
                    {action.buttonText}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="easeL-heading-2 mb-4">Your summary</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((item) => (
              <div
                key={item.label}
                className="easeL-card rounded-2xl px-5 py-4 min-h-[108px] flex flex-col justify-center border-2"
                style={{ borderColor: "var(--easeL-border-strong)", background: "var(--easeL-bg-section)" }}
              >
                <p
                  className="text-[0.82rem] font-medium"
                  style={{ color: "var(--easeL-text-muted)" }}
                >
                  {item.label}
                </p>
                <p className="mt-1.5 text-[1.22rem] font-semibold leading-tight" style={{ color: "var(--easeL-text)" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
