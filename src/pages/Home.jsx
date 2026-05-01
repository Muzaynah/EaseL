import { Link } from "react-router-dom";
import { BookOpen, Image as ImageIcon, Pencil, Play, BarChart3 } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { getTrialLog, getSessionLog } from "../utils/persistence";
import {
  getStage,
  firstStageForMode,
  lastStageForMode,
} from "../utils/lessonContent";

const MS_PER_HOUR = 1000 * 60 * 60;

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const displayName = user?.name ?? profile?.name ?? "there";
  const pathId = effectivePathId ?? profile?.pathId ?? profile?.lipMode ?? null;

  if (pathId === 1) {
    return <Mode1Home displayName={displayName} />;
  }
  return <Mode2Home displayName={displayName} profile={profile} />;
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

function Mode1Home({ displayName }) {
  return (
    <div
      className="easeL-page-bg flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-24"
    >
      <div className="w-full max-w-xl text-center">
        <p className="mb-3 text-2xl" style={{ color: "var(--easeL-text-muted)" }}>
          Hi, {displayName}
        </p>
        <h1
          className="mb-10 text-3xl font-extrabold md:text-4xl"
          style={{ color: "var(--easeL-text)" }}
        >
          Ready to practise?
        </h1>
        <Link
          to="/lesson-path1"
          className="group flex flex-col items-center gap-6 rounded-[2.5rem] p-10 text-white shadow-2xl transition-transform hover:scale-[1.02] active:scale-[0.99] sm:p-12"
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

function Mode2Home({ displayName, profile }) {
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
      icon: BookOpen,
      title: "Guided Lessons",
      description: "Corridor tracing with scaffolded assistance.",
      buttonText: "Open Lessons",
      path: "/lessons",
      primary: true,
      tone: "lavender",
    },
    {
      icon: Pencil,
      title: "Free Draw",
      description: "Open canvas for free practice (optional).",
      buttonText: "Open Canvas",
      path: "/canvas",
      tone: "ash",
    },
    {
      icon: ImageIcon,
      title: "My Gallery",
      description: "Saved drawings you created.",
      buttonText: "View Gallery",
      path: "/gallery",
      tone: "coral",
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
    <div className="easeL-page-bg min-h-screen px-4 pb-16 pt-24 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-6xl space-y-12">
        <section>
            <div
              className="easeL-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:p-6 border-2"
              style={{ borderColor: "var(--easeL-border-strong)", background: "var(--easeL-bg-section)" }}
            >
              <div>
                <h1 className="easeL-heading-1 max-w-[16ch] text-balance">
                  Welcome back, {displayName}
                </h1>
                <p className="mt-1 text-base" style={{ color: "var(--easeL-text-muted)" }}>
                  Path 2 · guided control · level {currentStage} ·{" "}
                  <span className="font-semibold" style={{ color: "var(--easeL-primary)" }}>
                    {currentStageDef?.title ?? "—"}
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  to="/progress"
                  className="easeL-interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 bg-white px-5 text-[0.95rem] font-semibold"
                  style={{ borderColor: "var(--easeL-border)", color: "var(--easeL-text)" }}
                >
                  <BarChart3 className="h-5 w-5" style={{ color: "var(--easeL-primary)" }} />
                  Progress
                </Link>
                <Link
                  to="/lessons"
                  className="easeL-btn-solid min-h-12 px-7 text-[1rem] font-semibold"
                  style={{ background: "var(--easeL-primary)" }}
                >
                  <BookOpen className="h-5 w-5" />
                  Continue path
                </Link>
              </div>
            </div>
        </section>

        <section>
          <h2 className="easeL-heading-2 mb-4">
            <span className="easeL-heading-highlight easeL-highlight-coral">Shortcuts</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const toneStyles =
                action.tone === "coral"
                  ? {
                      cardBg: "var(--easeL-bg-card-coral)",
                      iconBg: "color-mix(in srgb, var(--easeL-accent-coral) 20%, white)",
                      iconColor: "var(--easeL-accent-coral)",
                      borderColor: "var(--easeL-border-subtle)",
                      accentLine: "var(--easeL-accent-coral)",
                    }
                  : action.tone === "ash"
                  ? {
                      cardBg: "var(--easeL-bg-card-mint)",
                      iconBg: "color-mix(in srgb, var(--easeL-accent-mint) 20%, white)",
                      iconColor: "var(--easeL-accent-mint)",
                      borderColor: "var(--easeL-border-subtle)",
                      accentLine: "var(--easeL-accent-mint)",
                    }
                  : {
                      cardBg: "var(--easeL-bg-card-butter)",
                      iconBg: "color-mix(in srgb, var(--easeL-primary-light) 24%, white)",
                      iconColor: "var(--easeL-primary)",
                      borderColor: "var(--easeL-border-subtle)",
                      accentLine: "var(--easeL-primary-light)",
                    };

              return (
                <div
                  key={action.title}
                  className="easeL-hoverable-card flex min-h-0 flex-col rounded-3xl border-2 p-5"
                  style={
                    action.primary
                      ? {
                          borderColor: "var(--easeL-border-strong)",
                          background: toneStyles.cardBg,
                          boxShadow: `inset 0 3px 0 ${toneStyles.accentLine}`,
                        }
                      : {
                          borderColor: "var(--easeL-border-strong)",
                          background: toneStyles.cardBg,
                          boxShadow: `inset 0 3px 0 ${toneStyles.accentLine}`,
                        }
                  }
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: toneStyles.iconBg }}
                    >
                      <Icon
                        className="h-6 w-6"
                        style={{ color: toneStyles.iconColor }}
                      />
                    </div>
                    <h3 className="easeL-heading-3">
                      {action.title}
                    </h3>
                  </div>
                  <p className="min-h-0 flex-1 text-[0.98rem]" style={{ color: "var(--easeL-text-muted)" }}>
                    {action.description}
                  </p>
                  <Link
                    to={action.path}
                    className="easeL-interactive mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl px-6 text-[0.98rem] font-semibold"
                    style={
                      action.primary
                        ? { background: "var(--easeL-primary)", color: "white" }
                        : {
                            border: `1px solid ${toneStyles.iconColor}`,
                            color: toneStyles.iconColor,
                            background: "var(--easeL-bg-section)",
                          }
                    }
                  >
                    {action.buttonText}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="easeL-heading-2 mb-4">
            <span className="easeL-heading-highlight easeL-highlight-lavender">Your summary</span>
          </h2>
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
