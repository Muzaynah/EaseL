import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleCheckBig,
  Clock,
  Gauge,
  Map,
  Play,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { getTrialLog, getSessionLog } from "../utils/persistence";
import {
  getStage,
  firstStageForMode,
  lastStageForMode,
  pathLessonDisplayLevel,
} from "../utils/lessonContent";
import imgFreeDrawMascot from "../assets/illustrations/vecteezy_a-blue-cartoon-shark-with-arms-and-legs_68086196.png";
import imgLessonsMascot from "../assets/illustrations/vecteezy_a-sticker-of-a-green-leaf-with-a-face_68086203.png";
import imgGalleryMascot from "../assets/illustrations/vecteezy_sticker-of-a-sad-red-object-with-eyes-closed_68086150.png";

const MS_PER_HOUR = 1000 * 60 * 60;

/** Same border token as greeting / easeL-card (`--easeL-border-strong`). */
const HOME_SUMMARY_BORDER = "var(--easeL-border-strong)";

/** Summary tiles: light tint at rest, full card color + icon fill on hover (see easeLPalette.css). */
const HOME_SUMMARY_ROW_STYLES = [
  {
    Icon: Map,
    cardBg: "var(--easeL-bg-card-butter)",
    cardBgRest:
      "color-mix(in srgb, var(--easeL-bg-section) 94%, var(--easeL-bg-card-butter) 6%)",
    iconBubble:
      "color-mix(in srgb, white 82%, var(--easeL-bg-card-butter) 18%)",
    iconBubbleRest:
      "color-mix(in srgb, var(--easeL-bg-section) 97%, var(--easeL-bg-card-butter) 3%)",
  },
  {
    Icon: BookOpen,
    cardBg: "var(--easeL-bg-card-mint)",
    cardBgRest:
      "color-mix(in srgb, var(--easeL-bg-section) 94%, var(--easeL-bg-card-mint) 6%)",
    iconBubble:
      "color-mix(in srgb, white 80%, var(--easeL-bg-card-mint) 20%)",
    iconBubbleRest:
      "color-mix(in srgb, var(--easeL-bg-section) 97%, var(--easeL-bg-card-mint) 3%)",
  },
  {
    Icon: CalendarDays,
    cardBg: "var(--easeL-bg-card-butter)",
    cardBgRest:
      "color-mix(in srgb, var(--easeL-bg-section) 94%, var(--easeL-bg-card-butter) 6%)",
    iconBubble:
      "color-mix(in srgb, white 82%, var(--easeL-bg-card-butter) 18%)",
    iconBubbleRest:
      "color-mix(in srgb, var(--easeL-bg-section) 97%, var(--easeL-bg-card-butter) 3%)",
  },
  {
    Icon: CircleCheckBig,
    cardBg: "var(--easeL-bg-card-mint)",
    cardBgRest:
      "color-mix(in srgb, var(--easeL-bg-section) 94%, var(--easeL-bg-card-mint) 6%)",
    iconBubble:
      "color-mix(in srgb, white 80%, var(--easeL-bg-card-mint) 20%)",
    iconBubbleRest:
      "color-mix(in srgb, var(--easeL-bg-section) 97%, var(--easeL-bg-card-mint) 3%)",
  },
  {
    Icon: Clock,
    cardBg: "var(--easeL-bg-card-butter)",
    cardBgRest:
      "color-mix(in srgb, var(--easeL-bg-section) 94%, var(--easeL-bg-card-butter) 6%)",
    iconBubble:
      "color-mix(in srgb, white 82%, var(--easeL-bg-card-butter) 18%)",
    iconBubbleRest:
      "color-mix(in srgb, var(--easeL-bg-section) 97%, var(--easeL-bg-card-butter) 3%)",
  },
  {
    Icon: Gauge,
    cardBg: "var(--easeL-bg-card-mint)",
    cardBgRest:
      "color-mix(in srgb, var(--easeL-bg-section) 94%, var(--easeL-bg-card-mint) 6%)",
    iconBubble:
      "color-mix(in srgb, white 80%, var(--easeL-bg-card-mint) 20%)",
    iconBubbleRest:
      "color-mix(in srgb, var(--easeL-bg-section) 97%, var(--easeL-bg-card-mint) 3%)",
  },
];

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
  const language = profile?.caregiverReported?.language ?? "en";

  if (pathId === 1) {
    return <Mode1Home welcomeFirstName={welcomeFirstName} language={language} />;
  }
  return <Mode2Home welcomeFirstName={welcomeFirstName} profile={profile} language={language} />;
}

function getPathLevelLabel(profile) {
  const pathId = profile?.pathId ?? profile?.lipMode ?? null;
  const currentStage = profile?.currentStage ?? profile?.currentLevel ?? null;
  if (!pathId) return "Not assigned";
  const displayLevel = currentStage != null ? pathLessonDisplayLevel(pathId, currentStage) : 1;
  if (pathId === 1) return `Path 1 · Level ${displayLevel}`;
  if (pathId === 2) return `Path 2 · Level ${displayLevel}`;
  return "Not assigned";
}

function Mode1Home({ welcomeFirstName, language }) {
  const ur = language === "ur";
  return (
    <div className="easeL-page-bg flex min-h-screen flex-col items-center justify-center px-3 pb-20 easeL-page-top sm:px-4">
      <div className="w-full min-w-0 max-w-xl text-center">
        <p className="mb-3 text-2xl" style={{ color: "var(--easeL-text-muted)" }}>
          {ur ? <span className="ur">ہیلو، {welcomeFirstName}!</span> : `Hi, ${welcomeFirstName}!`}
        </p>
        <h1 className="mb-10 text-3xl font-extrabold md:text-4xl" style={{ color: "var(--easeL-text)" }}>
          {ur ? <span className="ur">کیا آپ مشق کے لیے تیار ہیں؟</span> : "Ready to practise?"}
        </h1>
        <Link
          to="/lesson-path1"
          className="group flex w-full max-w-full flex-col items-center gap-6 rounded-[2rem] p-8 text-white shadow-2xl transition-transform hover:scale-[1.02] active:scale-[0.99] sm:rounded-[2.5rem] sm:p-10 md:p-12"
          style={{ background: "var(--easeL-primary)", boxShadow: "var(--easeL-shadow-soft)" }}
          aria-label={ur ? "آج کا سبق شروع کریں" : "Start today's lesson"}
        >
          <span className="flex h-28 w-28 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, white 22%, transparent)" }}>
            <Play className="h-16 w-16 fill-white" strokeWidth={0} />
          </span>
          <span className={`text-4xl font-extrabold tracking-tight md:text-5xl ${ur ? "ur" : ""}`}>
            {ur ? "سبق شروع کریں" : "Start lesson"}
          </span>
        </Link>
        <p className="mt-8 text-lg" style={{ color: "var(--easeL-text-muted)" }}>
          {ur
            ? <span className="ur">نگہبان: اوپر دائیں طرف اپنے نام کے پہلے حرف والے بٹن سے profile اور progress دیکھیں۔</span>
            : "Caregiver: use the button top right (your initial) for profile, settings, and progress."}
        </p>
      </div>
    </div>
  );
}

function Mode2Home({ welcomeFirstName, profile, language }) {
  const ur = language === "ur";
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
  const displayLessonLevel = pathLessonDisplayLevel(2, currentStage);

  const quickActions = [
    {
      title: ur ? "سبق" : "Guided Lessons",
      description: ur ? "قدم بہ قدم سبق سے ڈرائنگ سیکھیں۔" : "Learn how to draw with step-by-step lessons.",
      buttonText: ur ? "سبق کھولیں" : "Open Lessons",
      path: "/lessons",
      tone: "lavender",
      mascot: imgLessonsMascot,
    },
    {
      title: ur ? "آزاد ڈرائنگ" : "Free Draw",
      description: ur ? "اپنی مرضی سے کینوس پر کچھ بھی بنائیں۔" : "A big blank canvas for your imagination.",
      buttonText: ur ? "کینوس کھولیں" : "Open Canvas",
      path: "/canvas",
      tone: "ash",
      mascot: imgFreeDrawMascot,
    },
    {
      title: ur ? "میری گیلری" : "My Gallery",
      description: ur ? "آپ کی تمام محفوظ ڈرائنگز یہاں ہیں۔" : "Your saved drawings and lessons in one place.",
      buttonText: ur ? "گیلری دیکھیں" : "View Gallery",
      path: "/gallery",
      tone: "coral",
      mascot: imgGalleryMascot,
    },
  ];

  const summary = [
    { label: ur ? "راستہ" : "Learning path", value: pathLevel },
    { label: ur ? "موجودہ سطح" : "Current level", value: ur ? `سطح ${displayLessonLevel}` : `Level ${displayLessonLevel}` },
    { label: ur ? "سیشن" : "Sessions logged", value: `${totalSessions}` },
    { label: ur ? "سبق پاس" : "Lesson attempts passed", value: `${completedLessons}` },
    { label: ur ? "مشق کا وقت" : "Practice time", value: `${practiceHours} h` },
    { label: ur ? "آخری calibration" : "Last calibrated", value: formatDate(profile?.calibration?.lastCalibratedAt) },
  ];

  return (
    <div className="easeL-page-bg min-h-screen px-3 pb-16 easeL-page-top sm:px-5 md:px-6 md:easeL-page-top">
      <div className="mx-auto max-w-6xl min-w-0 space-y-10 sm:space-y-12">
        <section className="min-w-0">
            <div
              className="easeL-card flex min-w-0 flex-col gap-3 border-2 p-4 sm:p-5 md:flex-row md:items-center md:justify-between md:p-6"
              style={{ borderColor: "var(--easeL-border-strong)", background: "var(--easeL-bg-section)" }}
            >
              <div className="min-w-0">
                <h1 className={`easeL-heading-1 text-balance ${ur ? "ur" : ""}`}>
                  {ur ? `ہیلو، ${welcomeFirstName}!` : `Hi, ${welcomeFirstName}!`}
                </h1>
                <p className="mt-1 text-base" style={{ color: "var(--easeL-text-muted)" }}>
                  {ur
                    ? <span className="ur">Path 2 · سطح {displayLessonLevel} · <span className="font-semibold" style={{ color: "var(--easeL-primary)" }}>{currentStageDef?.title ?? "—"}</span></span>
                    : <>Path 2 · guided control · level {displayLessonLevel} · <span className="font-semibold" style={{ color: "var(--easeL-primary)" }}>{currentStageDef?.title ?? "—"}</span></>}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
                <Link
                  to="/progress"
                  className="easeL-btn-outline inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 px-5 text-[0.95rem] font-semibold sm:w-auto"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className={ur ? "ur" : ""}>{ur ? "ترقی" : "Progress"}</span>
                </Link>
                <Link
                  to="/lessons"
                  className="easeL-btn-solid min-h-12 w-full min-w-0 justify-center px-7 text-[1rem] font-semibold sm:w-auto"
                  style={{ background: "var(--easeL-primary)" }}
                >
                  <BookOpen className="h-5 w-5" />
                  <span className={ur ? "ur" : ""}>{ur ? "آگے جاری رکھیں" : "Continue path"}</span>
                </Link>
              </div>
            </div>
        </section>

        <section className="min-w-0">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={`easeL-heading-2 shrink-0 ${ur ? "ur" : ""}`}>{ur ? "آج کیا کرنا ہے؟" : "What do you want to do today?"}</h2>
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
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3 lg:items-stretch lg:gap-4">
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
              const isFreeDrawMascot = action.path === "/canvas";
              const mascotImgSize = isLessonsMascot
                ? { w: 120, h: 120 }
                : isFreeDrawMascot
                ? { w: 200, h: 200 }
                : { w: 120, h: 120 };
              const mascotSizeClass = isLessonsMascot
                ? "easeL-home-shortcut-mascot--compact h-[5.35rem] max-h-[5.35rem] w-auto sm:h-[6.25rem] sm:max-h-[6.25rem]"
                : isFreeDrawMascot
                ? "easeL-home-shortcut-mascot--compact h-[7.75rem] max-h-[7.75rem] w-auto max-w-[min(100%,10.5rem)] sm:h-[9.25rem] sm:max-h-[9.25rem] sm:max-w-[12rem]"
                : "easeL-home-shortcut-mascot--compact h-[5.35rem] max-h-[5.35rem] w-auto sm:h-[6.25rem] sm:max-h-[6.25rem]";

              return (
                <div
                  key={action.title}
                  className="easeL-home-shortcut-card easeL-hoverable-card flex min-h-[13.25rem] min-w-0 flex-col rounded-3xl border-[3px] px-3 py-3 sm:min-h-[14.25rem] sm:px-4 sm:py-3.5"
                  style={{
                    borderColor: toneStyles.borderColor,
                    background: toneStyles.cardBg,
                    ["--easeL-card-accent-inset"]: toneStyles.accentLine,
                  }}
                >
                  <div
                    className={`flex min-h-0 min-w-0 flex-1 flex-col justify-center ${isFreeDrawMascot ? "pb-2 sm:pb-2.5" : ""}`}
                  >
                    <div className="flex w-full flex-row items-center gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1 basis-0 text-left">
                        <h3 className={`easeL-home-shortcut-title text-pretty leading-snug ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-ink)" }}>
                          {action.title}
                        </h3>
                        <p className={`mt-1.5 max-w-[32ch] text-[1rem] font-medium leading-snug sm:text-[1.02rem] ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
                          {action.description}
                        </p>
                      </div>
                      {action.mascot ? (
                        <div className="flex shrink-0 items-center justify-center self-center">
                          <img
                            src={action.mascot}
                            alt=""
                            width={mascotImgSize.w}
                            height={mascotImgSize.h}
                            className={`easeL-home-shortcut-mascot pointer-events-none block shrink-0 select-none object-contain object-center ${mascotSizeClass} easeL-home-shortcut-mascot--thin-outline`}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    to={action.path}
                    className={`easeL-home-shortcut-cta mt-2.5 w-full shrink-0 sm:mt-3 ${ur ? "ur" : ""}`}
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

        <section className="min-w-0">
          <h2 className={`easeL-heading-2 mb-4 text-balance sm:mb-5 ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-ink)" }}>
            {ur ? "خلاصہ" : "Your summary"}
          </h2>
          <div
            className="easeL-home-summary-panel rounded-3xl border-2 p-4 sm:p-5 md:p-6"
            style={{
              borderColor: HOME_SUMMARY_BORDER,
              background: "var(--easeL-bg-section)",
              boxShadow: "var(--easeL-cartoon-shadow)",
            }}
          >
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3 lg:gap-2">
              {summary.map((item, index) => {
                const row = HOME_SUMMARY_ROW_STYLES[index] ?? HOME_SUMMARY_ROW_STYLES[0];
                const { Icon, iconBubble, iconBubbleRest, cardBg, cardBgRest } = row;
                return (
                  <div
                    key={item.label}
                    className="easeL-home-summary-stat easeL-hoverable-card flex min-w-0 w-full flex-col justify-center rounded-2xl border-2 px-3 py-2.5 sm:px-3 sm:py-3"
                    style={{
                      borderColor: HOME_SUMMARY_BORDER,
                      ["--easeL-summary-bg-rest"]: cardBgRest,
                      ["--easeL-summary-bg-fill"]: cardBg,
                      ["--easeL-summary-icon-rest"]: iconBubbleRest,
                      ["--easeL-summary-icon-fill"]: iconBubble,
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div
                        className="easeL-home-summary-stat-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2"
                        style={{ borderColor: HOME_SUMMARY_BORDER }}
                        aria-hidden
                      >
                        <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.35} style={{ color: "var(--easeL-ink)" }} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className={`text-[0.78rem] font-semibold leading-tight sm:text-[0.8rem] ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                          {item.label}
                        </p>
                        <p className={`mt-1 text-[1.02rem] font-bold leading-snug text-pretty sm:text-[1.06rem] ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-ink)" }}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
