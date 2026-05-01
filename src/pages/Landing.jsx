import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  LayoutGrid,
  Monitor,
  Move,
  Smile,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import imgWheelchair from "../assets/images/lifestyle-child-wheelchair.jpg";
import imgFamily from "../assets/images/family-mother-child-outdoors.jpg";

const CAROUSEL_IMAGES = [
  {
    src: imgWheelchair,
    alt: "Child outdoors in a wheelchair, smiling; representing independence and support.",
    detail: "Enhance movement and control in everyday life",
  },
  {
    src: imgFamily,
    alt: "Parent and child spending time together; EaseL is built for families and caregivers.",
    detail: "Support your child's learning and independence",
  },
];

const INTERACTION = [
  {
    icon: Move,
    title: "Lateral head tilt",
    text: "The cursor is driven mainly from side-to-side head tilt, so the learner can keep their eyes on the screen; turning and strong nodding are de-emphasised in the design.",
    tone: "lavender",
  },
  {
    icon: Smile,
    title: "Mouth open or dwell",
    text: "A deliberate mouth-open (with timing rules to reduce false triggers) or dwell-at-target activation can be used, depending on what the in-app screener suggests for that person.",
    tone: "coral",
  },
  {
    icon: LayoutGrid,
    title: "Rolling neutral",
    text: "Resting head position can drift. The system keeps updating a soft baseline in the background so small tilts still map clearly without repeated manual resets.",
    tone: "ash",
  },
];

const MODES = [
  {
    name: "Path 1 — Intent Assist",
    when: "For learners who need stronger support for intent-first interaction.",
    body:
      "Path 1 contains progressive levels and lessons where intent is prioritized and support is higher. Complex lessons are broken into clear steps.",
    cardClass: "easeL-surface-lavender border-[color:var(--easeL-border-subtle)]",
  },
  {
    name: "Path 2 — Guided Control",
    when: "For learners ready for more direct cursor guidance with scaffolding.",
    body:
      "Path 2 contains levels and lessons focused on guided control. Complex shapes are taught step-by-step so progress is visible and motivating.",
    cardClass: "easeL-surface-coral border-[color:var(--easeL-border-subtle)]",
  },
];

export default function Landing() {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (dir) => {
      setSlide((i) => (i + dir + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
    },
    []
  );

  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [paused, go]);

  const s = CAROUSEL_IMAGES[slide];

  return (
    <div
      className="min-h-screen pb-0"
      style={{
        color: "var(--easeL-text)",
        background: "var(--easeL-bg-page)",
      }}
    >
      <main className="relative w-full">
        {/* Hero */}
        <section
          className="easeL-full-bleed-panel pt-28 pb-14 md:pt-32 md:pb-16"
          style={{ background: "var(--easeL-bg-card-coral)" }}
          aria-labelledby="easeL-hero-heading"
        >
          <div className="easeL-panel-inner grid items-center gap-0 lg:grid-cols-2">
          <div className="flex items-center px-6 sm:px-8 lg:px-12">
            <div className="w-full max-w-[640px]">
            <h1
              id="easeL-hero-heading"
              className="landing-hero-line font-easeL-display text-4xl leading-[1.02] sm:text-5xl lg:text-6xl"
              style={{ color: "var(--easeL-accent-coral)", ["--line-delay"]: "0.05s", maxWidth: "13ch" }}
            >
              Every child deserves creative expression.
              
            </h1>
            <p
              className="landing-hero-line mt-5 text-lg sm:text-xl"
              style={{ color: "var(--easeL-text-muted)", maxWidth: "32ch", ["--line-delay"]: "0.2s" }}
            >
              EaseL is an assistive, hands-free learning and drawing platform for children with cerebral palsy and other motor challenges, controlled by head movement and facial gestures.
              It allows children to create, learn, and progress independently.

            </p>
            <div
              className="landing-hero-line mt-7 flex min-h-14 flex-wrap items-center gap-3"
              style={{ ["--line-delay"]: "0.28s" }}
            >
              <Link
                to="/signup"
                className="inline-flex min-h-14 min-w-[10rem] items-center justify-center rounded-2xl px-8 text-lg font-semibold text-white shadow-lg transition hover:opacity-95"
                style={{ background: "var(--easeL-primary)" }}
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-14 min-w-[8rem] items-center justify-center gap-2 rounded-2xl border-2 bg-white px-7 text-lg font-semibold transition hover:brightness-[0.98]"
                style={{
                  borderColor: "var(--easeL-border-strong)",
                  color: "var(--easeL-link)",
                }}
              >
                Sign in
                <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.5} />
              </Link>
            </div>
            </div>
          </div>

          {/* Photo carousel: large, accessible controls */}
          <div
            className="landing-enter relative flex w-full items-center px-6 sm:px-8 lg:px-12"
            style={{ ["--enter-delay"]: "0.15s" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[var(--easeL-radius-xl)] border-2 bg-[color:var(--easeL-bg-section)] p-3 lg:ml-auto"
              style={{
                borderColor: "var(--easeL-border-strong)",
                boxShadow:
                  "0 8px 0 color-mix(in srgb, var(--easeL-border-strong) 22%, transparent), 0 20px 26px color-mix(in srgb, var(--easeL-primary) 16%, transparent)",
              }}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.2rem] border-2" style={{ borderColor: "var(--easeL-border-subtle)" }}>
                <div key={s.src} className="easeL-carousel-panel h-full w-full">
                  <img
                    src={s.src}
                    alt={s.alt}
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5 text-white"
                >
                  <p
                    className="text-base font-semibold sm:text-lg"
                    style={{ color: "var(--easeL-text-on-dark)" }}
                  >
                    {s.detail}
                  </p>
                </div>
              </div>
              <div className="mt-4 mb-2 flex flex-wrap items-center justify-center">
                <div className="flex gap-2" role="tablist" aria-label="Photo slide">
                  {CAROUSEL_IMAGES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === slide}
                      aria-label={`Show photo ${i + 1}`}
                      className="h-3 w-3 rounded-full border-2 transition"
                      style={{
                        borderColor: "var(--easeL-border-strong)",
                        background: i === slide ? "var(--easeL-primary)" : "transparent",
                      }}
                      onClick={() => setSlide(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* Who it is for */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-14 md:py-16"
          style={{
            background: "var(--easeL-bg-section-alt)",
            ["--enter-delay"]: "0.25s",
          }}
          aria-labelledby="easeL-who"
        >
          <div className="easeL-panel-inner">
            <h2
              id="easeL-who"
              className="font-easeL-display text-3xl sm:text-4xl"
              style={{ color: "var(--easeL-text)" }}
            >
              <span className="easeL-heading-highlight easeL-highlight-coral">Who it is for</span>
            </h2>
            <ul className="mt-6 space-y-4 text-lg sm:text-xl" style={{ color: "var(--easeL-text-muted)" }}>
            <li className="flex gap-3">
              <CheckCircle2 className="h-7 w-7 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
              <span>
                Children and adolescents with cerebral palsy or motor impairments.
              </span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-7 w-7 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
              <span>
              Families, caregivers and clinicians supporting the child's treatment and development.
              </span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-7 w-7 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
              <span>
                Therapists and educators who are looking for a tool to help children with motor challenges.
              </span>
            </li>
            </ul>
          </div>
        </section>

        {/* How interaction is designed */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-14 md:py-16"
          style={{ ["--enter-delay"]: "0.32s", background: "var(--easeL-bg-section)" }}
          aria-labelledby="easeL-interaction"
        >
          <div className="easeL-panel-inner">
          <h2
            id="easeL-interaction"
            className="font-easeL-display text-3xl sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            <span className="easeL-heading-highlight easeL-highlight-mint">How control is designed</span>
          </h2>
          <p className="mt-3 max-w-3xl text-lg sm:text-xl" style={{ color: "var(--easeL-text-muted)" }}>
            The interaction model in EaseL follows the cerebral palsy–specific framework: tilt-led
            navigation, careful activation, and a neutral position that is allowed to move over time.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {INTERACTION.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="min-h-[12rem] rounded-2xl border p-6 sm:p-7"
                  style={{
                    background:
                      item.tone === "coral"
                        ? "var(--easeL-bg-card-coral)"
                        : item.tone === "ash"
                        ? "var(--easeL-bg-card-mint)"
                        : "var(--easeL-bg-card-butter)",
                    borderColor: "var(--easeL-border-subtle)",
                    boxShadow: "var(--easeL-shadow-soft)",
                  }}
                >
                  <div
                    className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl"
                    style={{ background: "var(--easeL-bg-section-alt)" }}
                  >
                    <Icon className="h-8 w-8" style={{ color: "var(--easeL-primary)" }} />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: "var(--easeL-text)" }}>
                    {item.title}
                  </h3>
                  <p className="mt-3 text-lg leading-relaxed" style={{ color: "var(--easeL-text-muted)" }}>
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>
          </div>
        </section>

        {/* Learning paths */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-14 md:py-16"
          style={{ ["--enter-delay"]: "0.38s", background: "var(--easeL-bg-card-mint)" }}
          aria-labelledby="easeL-modes"
        >
          <div className="easeL-panel-inner">
          <h2
            id="easeL-modes"
            className="font-easeL-display text-3xl sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            <span className="easeL-heading-highlight easeL-highlight-lavender">Learning paths, levels, and lessons</span>
          </h2>
          <p className="mt-3 max-w-3xl text-lg sm:text-xl" style={{ color: "var(--easeL-text-muted)" }}>
            A short in-app screener assigns the learner to the best path. Each path has levels;
            each level contains lessons; complex lessons are split into steps so progress stays clear.
          </p>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {MODES.map((m) => (
              <article
                key={m.name}
                className={`min-h-[14rem] rounded-2xl border p-6 sm:p-8 ${m.cardClass}`}
              >
                <h3 className="text-2xl font-bold" style={{ color: "var(--easeL-text)" }}>
                  {m.name}
                </h3>
                <p className="mt-2 text-lg font-medium" style={{ color: "var(--easeL-primary)" }}>
                  {m.when}
                </p>
                <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--easeL-text-muted)" }}>
                  {m.body}
                </p>
              </article>
            ))}
          </div>
          </div>
        </section>

        {/* Sessions, reinforcement, what EaseL does not claim */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-14 md:py-16"
          style={{
            background: "var(--easeL-bg-section)",
            ["--enter-delay"]: "0.44s",
          }}
          aria-labelledby="easeL-sessions"
        >
          <div className="easeL-panel-inner rounded-3xl border-2 p-6 sm:p-10" style={{ borderColor: "var(--easeL-border)" }}>
          <h2
            id="easeL-sessions"
            className="font-easeL-display text-3xl sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            Sessions, feedback, and what success means here
          </h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold" style={{ color: "var(--easeL-text)" }}>
                Time on screen
              </h3>
              <p className="mt-3 text-lg leading-relaxed" style={{ color: "var(--easeL-text-muted)" }}>
                First sessions are short (on the order of a few to ten minutes). Longer work only
                makes sense when tolerance is clear, with breaks to reduce fatigue. The app is
                built around the idea of brief tries, not long drills.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold" style={{ color: "var(--easeL-text)" }}>
                Reinforcement, not a red cross
              </h3>
              <p className="mt-3 text-lg leading-relaxed" style={{ color: "var(--easeL-text-muted)" }}>
                The framework calls for positive feedback after each completed attempt, without
                treating motor noise as a public failure. The point is effort, focus, and a sense
                of agency, not a neat line score.
              </p>
            </div>
          </div>
          <div
            className="mt-8 rounded-2xl border-2 p-5 sm:p-6"
            style={{ borderColor: "var(--easeL-border)", background: "var(--easeL-bg-card-coral)" }}
          >
            <p className="text-lg font-semibold" style={{ color: "var(--easeL-text)" }}>
              EaseL does not claim to treat CP, improve a fixed motor curve on demand, or measure
              “mental age.” It is a learning and practice tool; medical decisions stay with
              families and care teams.
            </p>
          </div>
          </div>
        </section>

        {/* Privacy + caregiving row */}
        <section className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-14 md:py-16" style={{ ["--enter-delay"]: "0.5s", background: "var(--easeL-bg-page)" }}>
          <div className="easeL-panel-inner grid gap-5 lg:grid-cols-2">
            <section
            className="rounded-2xl border-2 p-6 sm:p-8"
            style={{
              background: "var(--easeL-bg-section)",
              borderColor: "var(--easeL-border)",
            }}
            aria-labelledby="easeL-privacy"
          >
            <div className="mb-3 flex items-center gap-2">
              <Camera className="h-7 w-7" style={{ color: "var(--easeL-primary)" }} />
              <h2
                id="easeL-privacy"
                className="text-2xl font-bold"
                style={{ color: "var(--easeL-text)" }}
              >
                Camera and data
              </h2>
            </div>
            <p className="text-lg leading-relaxed" style={{ color: "var(--easeL-text-muted)" }}>
              Video from the camera is processed in the browser to drive interaction; the design
              is to keep derived data minimal and to avoid storing raw video the way a recording app
              would. Export is meant for metrics a caregiver is comfortable with, not silent upload.
            </p>
          </section>
          <section
            className="rounded-2xl border-2 p-6 sm:p-8"
            style={{
              background: "var(--easeL-bg-cream)",
              borderColor: "var(--easeL-border)",
            }}
            aria-labelledby="easeL-caregiver"
          >
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-7 w-7" style={{ color: "var(--easeL-primary)" }} />
              <h2
                id="easeL-caregiver"
                className="text-2xl font-bold"
                style={{ color: "var(--easeL-text)" }}
              >
                For caregivers
              </h2>
            </div>
            <p className="text-lg leading-relaxed" style={{ color: "var(--easeL-text-muted)" }}>
              The flow expects help the first time: account, device placement, and reading prompts
              if the learner does best with a familiar voice. Optional languages (including Urdu
              where implemented) and icon-first screens are part of the direction of the work.
            </p>
            <ul className="mt-4 space-y-2 text-lg" style={{ color: "var(--easeL-text-muted)" }}>
              <li className="flex gap-2">
                <Monitor className="h-6 w-6 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
                Use a stable table and a screen large enough to see targets clearly.
              </li>
              <li className="flex gap-2">
                <BookOpen className="h-6 w-6 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
                A tutorial step shows tilt and activation before real lessons, so expectations match.
              </li>
            </ul>
          </section>
          </div>
        </section>

        {/* CTA */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-14 md:py-16"
          style={{
            background: "var(--easeL-primary)",
            color: "var(--easeL-text-on-dark)",
            ["--enter-delay"]: "0.6s",
          }}
        >
          <div className="easeL-panel-inner p-8 sm:p-12">
          <h2
            className="font-easeL-display text-3xl sm:text-4xl"
            style={{ color: "var(--easeL-text-on-dark)" }}
          >
            Ready to try the setup flow?
          </h2>
          <p className="mt-4 max-w-2xl text-lg sm:text-xl" style={{ color: "var(--easeL-text-on-dark-muted)" }}>
            Create an account to walk through sign-up, then calibration, tutorial, and
            path assignment. Progress is shown as path, level, lesson, and step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex min-h-14 min-w-[10rem] items-center justify-center rounded-2xl border-2 px-8 text-lg font-semibold transition hover:brightness-105"
              style={{
                color: "var(--easeL-text-on-dark)",
                borderColor: "var(--easeL-text-on-dark)",
                background: "color-mix(in srgb, white 14%, transparent)",
              }}
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-14 min-w-[12rem] items-center justify-center rounded-2xl border-2 border-white/90 px-7 text-lg font-semibold text-[color:var(--easeL-text-on-dark)]"
            >
              I already have an account
            </Link>
          </div>
          </div>
        </section>

      </main>
    </div>
  );
}
