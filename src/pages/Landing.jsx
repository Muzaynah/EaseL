import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Heart,
  LayoutGrid,
  Monitor,
  Move,
  Shield,
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
  },
  {
    icon: Smile,
    title: "Mouth open or dwell",
    text: "A deliberate mouth-open (with timing rules to reduce false triggers) or dwell-at-target activation can be used, depending on what the in-app screener suggests for that person.",
  },
  {
    icon: LayoutGrid,
    title: "Rolling neutral",
    text: "Resting head position can drift. The system keeps updating a soft baseline in the background so small tilts still map clearly without repeated manual resets.",
  },
];

const MODES = [
  {
    name: "Path 1 — Intent Assist",
    when: "For learners who need stronger support for intent-first interaction.",
    body:
      "Path 1 contains progressive levels and lessons where intent is prioritized and support is higher. Complex lessons are broken into clear steps.",
    cardClass: "bg-[color:var(--easeL-bg-card-butter)] border-[color:var(--easeL-border)]",
  },
  {
    name: "Path 2 — Guided Control",
    when: "For learners ready for more direct cursor guidance with scaffolding.",
    body:
      "Path 2 contains levels and lessons focused on guided control. Complex shapes are taught step-by-step so progress is visible and motivating.",
    cardClass: "bg-[color:var(--easeL-bg-card-mint)] border-[color:var(--easeL-border)]",
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
      className="min-h-screen pb-16"
      style={{
        color: "var(--easeL-text)",
        background: "var(--easeL-bg-page)",
      }}
    >
      {/* Ambient orbs (decorative) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -left-20 top-0 h-80 w-80 rounded-full opacity-90 blur-3xl animate-float-slow"
          style={{ background: "var(--easeL-hero-glow-1)" }}
        />
        <div
          className="absolute -right-16 top-40 h-96 w-96 rounded-full opacity-80 blur-3xl animate-float-slower"
          style={{ background: "var(--easeL-hero-glow-2)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full opacity-75 blur-3xl animate-float-slow"
          style={{ background: "var(--easeL-hero-glow-3)" }}
        />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section
          className="grid items-center gap-10 pt-28 md:pt-32 lg:grid-cols-2 lg:gap-14"
          aria-labelledby="easeL-hero-heading"
        >
          <div>
            <p
              className="landing-hero-line mb-4 inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 py-2 text-base font-semibold"
              style={{
                lineHeight: 1.3,
                borderColor: "var(--easeL-border)",
                background: "var(--easeL-bg-section)",
                color: "var(--easeL-primary)",
                ["--line-delay"]: "0.05s",
              }}
            >
              <span className="text-[color:var(--easeL-text)]">
                Visuomotor learning for children with cerebral palsy
              </span>
            </p>
            <h1
              id="easeL-hero-heading"
              className="landing-hero-line font-easeL-display text-4xl leading-[1.12] sm:text-4xl lg:text-5xl"
              style={{ color: "var(--easeL-text)", ["--line-delay"]: "0.12s" }}
            >
              Every child deserves creative expression.
              
            </h1>
            <p
              className="landing-hero-line mt-5 text-lg sm:text-xl"
              style={{ color: "var(--easeL-text-muted)", maxWidth: "38ch", ["--line-delay"]: "0.2s" }}
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

          {/* Photo carousel: large, accessible controls */}
          <div
            className="landing-enter relative w-full"
            style={{ ["--enter-delay"]: "0.15s" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="overflow-hidden rounded-[var(--easeL-radius-xl)] border-2 p-2 shadow-2xl"
              style={{
                borderColor: "var(--easeL-border-subtle)",
                background: "var(--easeL-bg-section)",
                boxShadow: "var(--easeL-shadow-soft)",
              }}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-black/5">
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
                  <p className="text-base font-semibold sm:text-lg">{s.detail}</p>
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
        </section>

        {/* Who it is for */}
        <section
          className="landing-enter -mx-4 mt-20 rounded-3xl border-2 p-6 sm:mx-0 sm:p-10"
          style={{
            borderColor: "var(--easeL-border)",
            background: "var(--easeL-bg-section-alt)",
            ["--enter-delay"]: "0.25s",
          }}
          aria-labelledby="easeL-who"
        >
          <h2
            id="easeL-who"
            className="font-easeL-display text-3xl sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            Who it is for
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
        </section>

        {/* How interaction is designed */}
        <section
          className="landing-enter mt-16"
          style={{ ["--enter-delay"]: "0.32s" }}
          aria-labelledby="easeL-interaction"
        >
          <h2
            id="easeL-interaction"
            className="font-easeL-display text-3xl sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            How control is designed
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
                  className="min-h-[12rem] rounded-2xl border-2 p-6 sm:p-7"
                  style={{
                    background: "var(--easeL-bg-section)",
                    borderColor: "var(--easeL-border)",
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
        </section>

        {/* Learning paths */}
        <section
          className="landing-enter mt-16"
          style={{ ["--enter-delay"]: "0.38s" }}
          aria-labelledby="easeL-modes"
        >
          <h2
            id="easeL-modes"
            className="font-easeL-display text-3xl sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            Learning paths, levels, and lessons
          </h2>
          <p className="mt-3 max-w-3xl text-lg sm:text-xl" style={{ color: "var(--easeL-text-muted)" }}>
            A short in-app screener assigns the learner to the best path. Each path has levels;
            each level contains lessons; complex lessons are split into steps so progress stays clear.
          </p>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {MODES.map((m) => (
              <article
                key={m.name}
                className={`min-h-[14rem] rounded-2xl border-2 p-6 sm:p-8 ${m.cardClass}`}
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
        </section>

        {/* Sessions, reinforcement, what EaseL does not claim */}
        <section
          className="landing-enter mt-16 rounded-3xl border-2 p-6 sm:p-10"
          style={{
            background: "var(--easeL-bg-section)",
            borderColor: "var(--easeL-border)",
            ["--enter-delay"]: "0.44s",
          }}
          aria-labelledby="easeL-sessions"
        >
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
        </section>

        {/* Privacy + caregiving row */}
        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <section
            className="landing-enter rounded-2xl border-2 p-6 sm:p-8"
            style={{
              background: "var(--easeL-bg-section)",
              borderColor: "var(--easeL-border)",
              ["--enter-delay"]: "0.5s",
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
            className="landing-enter rounded-2xl border-2 p-6 sm:p-8"
            style={{
              background: "var(--easeL-bg-cream)",
              borderColor: "var(--easeL-border)",
              ["--enter-delay"]: "0.55s",
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

        {/* CTA */}
        <section
          className="landing-enter mt-16 rounded-3xl p-8 sm:p-12"
          style={{
            background: "var(--easeL-primary)",
            color: "var(--easeL-text-on-dark)",
            ["--enter-delay"]: "0.6s",
          }}
        >
          <h2 className="font-easeL-display text-3xl sm:text-4xl">Ready to try the setup flow?</h2>
          <p className="mt-4 max-w-2xl text-lg sm:text-xl" style={{ color: "var(--easeL-text-on-dark-muted)" }}>
            Create an account to walk through sign-up, then eligibility, calibration, tutorial, and
            path assignment. Progress is shown as path, level, lesson, and step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex min-h-14 min-w-[10rem] items-center justify-center rounded-2xl bg-white px-8 text-lg font-semibold transition hover:brightness-95"
              style={{ color: "var(--easeL-primary)" }}
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
        </section>

        {/* Footer */}
        <footer
          className="landing-enter mt-20 border-t-2 pt-12"
          style={{ borderColor: "var(--easeL-border)", ["--enter-delay"]: "0.65s" }}
        >
          <div
            className="grid gap-10 rounded-3xl p-8 sm:p-10 lg:grid-cols-2"
            style={{ background: "var(--easeL-bg-footer)", color: "var(--easeL-text-on-dark-muted)" }}
          >
            <div>
              <p className="font-easeL-display text-4xl text-[color:var(--easeL-text-on-dark)]">
                EaseL
              </p>
              <p className="mt-3 text-lg leading-relaxed">
                CP-focused visuomotor learning in the browser, with care for how movement, time on
                task, and family context actually work.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[color:var(--easeL-text-on-dark)]">Remember</h3>
              <ul className="mt-3 space-y-2 text-lg">
                <li className="flex gap-2">
                  <Heart className="h-6 w-6 shrink-0 text-[color:var(--easeL-accent-rose)]" />
                  The aim is practice and a sense of control, not a contest for a steady hand.
                </li>
                <li className="flex gap-2">
                  <Shield className="h-6 w-6 shrink-0 text-[color:var(--easeL-text-on-dark)]" />
                  EaseL is not a medical device. Use is not a replacement for professional advice.
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
