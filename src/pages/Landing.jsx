import { Fragment, useCallback, useEffect, useId, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  Heart,
  Monitor,
  Shield,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import InteractionSpotArt from "../components/landing/InteractionSpotArt";
import imgWheelchair from "../assets/images/lifestyle-child-wheelchair.jpg";
import imgFamily from "../assets/images/family-mother-child-outdoors.jpg";
import imgCareConversation from "../assets/images/Cerebral-Palsy-1-768x505.jpg.jpg";

/** Drop a short hero loop here later (WebM/MP4); until then the poster carousel is the visual. */
const HERO_VIDEO_SRC = null;

/** One loop of the ticker; repeated for seamless scroll */
const MARQUEE_PARTS = [
  "Hands-free drawing practice",
  "Head tilt drives the cursor",
  "Lessons matched to your path",
  "Built for kids who move differently",
  "Families and schools stay in the loop",
];

const CAROUSEL_IMAGES = [
  {
    src: imgWheelchair,
    alt: "Child outdoors in a wheelchair, smiling; representing independence and support.",
    detail: "Movement and control in everyday life",
  },
  {
    src: imgFamily,
    alt: "Parent and child spending time together; EaseL is built for families and caregivers.",
    detail: "Learning together, at your pace",
  },
  {
    src: imgCareConversation,
    alt: "Caregiver and young person in a wheelchair facing each other outdoors, both smiling; supportive connection at home.",
    detail: "Support that meets you where you are",
  },
];

const INTERACTION = [
  {
    visual: "tilt",
    title: "Lateral head tilt",
    text: "The cursor is driven mainly from side-to-side head tilt, so the learner can keep their eyes on the screen; turning and strong nodding are de-emphasised in the design.",
    tone: "lavender",
  },
  {
    visual: "mouth",
    title: "Mouth open or dwell",
    text: "A deliberate mouth-open (with timing rules to reduce false triggers) or dwell-at-target activation can be used, depending on what the in-app screener suggests for that person.",
    tone: "coral",
  },
  {
    visual: "baseline",
    title: "Rolling neutral",
    text: "Resting head position can drift. The system keeps updating a soft baseline in the background so small tilts still map clearly without repeated manual resets.",
    tone: "ash",
  },
];

const MODES = [
  {
    name: "Path 1 — Intent Assist",
    hook: "When intent needs to come first and support stays high.",
    skills: ["Step-by-step lessons", "Clear feedback", "Progressive levels"],
    body:
      "Path 1 contains progressive levels and lessons where intent is prioritized and support is higher. Complex lessons are broken into clear steps.",
    pathVariant: "a",
  },
  {
    name: "Path 2 — Guided Control",
    hook: "When the learner is ready for guided tracing with scaffolding.",
    skills: ["Hand-free drawing", "Shape paths", "Visible milestones"],
    body:
      "Path 2 contains levels and lessons focused on guided control. Complex shapes are taught step-by-step so progress is visible and motivating.",
    pathVariant: "b",
  },
];

const WHY_EASEL = [
  {
    icon: Heart,
    title: "Practice that feels like play",
    text: "Tracing, paths, and free draw turn screen time into something active — short tries, clear goals, and encouragement after each attempt.",
  },
  {
    icon: Shield,
    title: "Honest about what we are",
    text: "EaseL is a learning and practice tool. It does not replace therapy or medical judgment; families and teams stay in charge of care decisions.",
  },
  {
    icon: Monitor,
    title: "Built for real rooms",
    text: "Calibration and tutorial set expectations before lessons. The flow assumes a stable screen, caregiver help the first time, and breaks when fatigue shows.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What is EaseL?",
    a: "EaseL is a browser-based app for head-tracked drawing and guided lessons. Children practise paths and shapes without using their hands; caregivers can follow progress after setup.",
  },
  {
    q: "Who is it for?",
    a: "Children and adolescents with cerebral palsy or other motor differences who can use head tilt (and optional mouth or dwell) to control an on-screen cursor — plus the families, educators, and therapists supporting them.",
  },
  {
    q: "What happens after I create an account?",
    a: "You move through sign-up, calibration, a short tutorial, and a path screener. The app then assigns Path 1 or Path 2 and unlocks lessons, canvas, and gallery according to that path.",
  },
  {
    q: "Does EaseL record video?",
    a: "Video is processed in the browser to drive interaction. The design aims to keep stored data minimal and avoid treating the session like a silent recording app — see the camera section below for details.",
  },
];

function SectionHeader({ eyebrow, title, subtitle, titleId }) {
  return (
    <header className="mb-6 max-w-3xl min-w-0">
      {eyebrow ? <p className="easeL-landing-eyebrow mb-2">{eyebrow}</p> : null}
      <h2
        id={titleId}
        className="easeL-heading-section text-3xl sm:text-4xl"
        style={{ color: "var(--easeL-text)" }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-lg sm:text-xl" style={{ color: "var(--easeL-text-muted)" }}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

function BrandMarquee() {
  const repeat = 8;
  const segment = (
    <>
      {Array.from({ length: repeat }, (_, i) => (
        <span key={i} className="easeL-marquee__chunk inline-flex items-center">
          {i > 0 ? (
            <span className="easeL-marquee__sep" aria-hidden>
              ·
            </span>
          ) : null}
          {MARQUEE_PARTS.map((part, j) => (
            <Fragment key={`${i}-${j}`}>
              {j > 0 ? (
                <span className="easeL-marquee__sep" aria-hidden>
                  ·
                </span>
              ) : null}
              <span className="easeL-marquee__phrase">{part}</span>
            </Fragment>
          ))}
        </span>
      ))}
    </>
  );
  return (
    <div className="easeL-marquee" aria-hidden="true">
      <div className="easeL-marquee__track">
        <div className="easeL-marquee__group">{segment}</div>
        <div className="easeL-marquee__group">{segment}</div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated, profile } = useAuth();
  const lang = profile?.caregiverReported?.language ?? "en";
  const ur = lang === "ur";
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const faqBaseId = useId();

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  return (
    <div
      className="min-h-screen pb-0"
      style={{
        color: "var(--easeL-text)",
        background: "var(--easeL-bg-page)",
      }}
    >
      <main className="relative w-full">
        {/* Hero — split: trust + outcome, media column */}
        <section
          className="easeL-landing-hero easeL-full-bleed-panel pt-28 pb-10 md:pt-32 md:pb-12"
          aria-labelledby="easeL-hero-heading"
        >
          <div className="easeL-panel-inner grid min-w-0 items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] xl:gap-12">
            <div className="flex min-w-0 items-center">
              <div className="w-full min-w-0 max-w-[640px]">
                <div className="landing-hero-line mb-2" style={{ ["--line-delay"]: "0s" }}>
                  <p className="easeL-landing-eyebrow">EaseL · {ur ? "سر سے ڈرائنگ" : "head-tracked drawing"}</p>
                </div>
                <h1
                  id="easeL-hero-heading"
                  className={`landing-hero-line easeL-landing-hero-display text-balance ${ur ? "ur" : ""}`}
                  style={{ ["--line-delay"]: "0.06s" }}
                >
                  {ur ? "سر کی حرکت سے ہر لکیر بنائیں۔" : "Let your head guide every stroke."}
                </h1>
                <p
                  className={`landing-hero-line mt-5 max-w-[42ch] text-lg leading-relaxed sm:text-xl ${ur ? "ur" : ""}`}
                  style={{ color: "var(--easeL-text)", ["--line-delay"]: "0.18s" }}
                >
                  {ur
                    ? "ایک browser-based app جس میں guided lessons، practice canvas، اور gallery ہے۔ Calibration اور path check سے سبق کو ذاتی بنایا جاتا ہے۔"
                    : "A browser-based app with guided paths, a practice canvas, and a gallery for saved work. Calibration and a short path check help tailor lessons — with families, therapists, and schools in the loop."}
                </p>
                <div
                  className="landing-hero-line mt-8 flex min-h-14 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
                  style={{ ["--line-delay"]: "0.26s" }}
                >
                  {isAuthenticated ? (
                    <Link to="/home" className="easeL-btn-solid inline-flex min-h-14 w-full min-w-0 justify-center gap-2 px-8 text-lg sm:w-auto sm:min-w-[10rem]">
                      <span className={ur ? "ur" : ""}>{ur ? "ڈیش بورڈ پر جائیں" : "Go to dashboard"}</span>
                      <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                    </Link>
                  ) : (
                    <>
                      <Link to="/signup" className="easeL-btn-solid inline-flex min-h-14 w-full min-w-0 justify-center px-8 text-lg sm:w-auto sm:min-w-[10rem]">
                        <span className={ur ? "ur" : ""}>{ur ? "شروع کریں" : "Get started"}</span>
                      </Link>
                      <Link to="/login" className="easeL-btn-outline inline-flex min-h-14 w-full min-w-0 justify-center gap-2 px-7 text-lg sm:w-auto sm:min-w-[8rem]">
                        <span className={ur ? "ur" : ""}>{ur ? "لاگ ان کریں" : "Sign in"}</span>
                        <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div
              className="landing-enter relative flex w-full min-w-0 items-center"
              style={{ ["--enter-delay"]: "0.12s" }}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <figure className="easeL-landing-media-frame mx-auto w-full min-w-0 max-w-[min(100%,40rem)] p-2.5 sm:p-3.5 xl:max-w-[min(100%,48rem)] lg:ml-auto">
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.15rem] border-2 sm:rounded-[1.25rem]"
                  style={{ borderColor: "var(--easeL-landing-hero-photo-border)" }}
                >
                  {HERO_VIDEO_SRC ? (
                    <video
                      className="h-full w-full object-cover"
                      poster={CAROUSEL_IMAGES[0].src}
                      muted
                      playsInline
                      loop
                      autoPlay={!reduceMotion}
                      aria-label="EaseL product preview"
                    >
                      <source src={HERO_VIDEO_SRC} type="video/webm" />
                    </video>
                  ) : null}
                  <div
                    className={`relative h-full w-full ${HERO_VIDEO_SRC ? "hidden" : ""}`}
                  >
                    <div
                      role="group"
                      aria-label="Photo highlights"
                      className="easeL-carousel-hero-hover-zone relative h-full w-full overflow-hidden"
                    >
                      <div
                        className={`flex h-full ${reduceMotion ? "" : "easeL-carousel-slide-track"}`}
                        style={{
                          width: `${CAROUSEL_IMAGES.length * 100}%`,
                          transform: `translateX(-${(slide * 100) / CAROUSEL_IMAGES.length}%)`,
                        }}
                      >
                        {CAROUSEL_IMAGES.map((item, i) => (
                          <div
                            key={item.src}
                            className={`easeL-carousel-slide-panel relative h-full shrink-0 overflow-hidden ${i === slide ? "easeL-carousel-slide-panel--active" : ""}`}
                            style={{ width: `${100 / CAROUSEL_IMAGES.length}%` }}
                          >
                            <div className="absolute inset-0 z-0 overflow-hidden">
                              <div
                                className={`easeL-carousel-image-zoom-inner h-full w-full origin-center ${reduceMotion ? "" : "easeL-carousel-image-zoom-inner--animated"}`}
                              >
                                <img
                                  src={item.src}
                                  alt={i === slide ? item.alt : ""}
                                  aria-hidden={i !== slide}
                                  className="h-full w-full select-none object-cover"
                                  draggable={false}
                                  loading={i === 0 ? "eager" : "lazy"}
                                  decoding="async"
                                  fetchPriority={i === 0 ? "high" : "auto"} />
                              </div>
                            </div>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/75 via-black/28 to-transparent px-5 pb-5 pt-14 sm:pt-16">
                              <p className="easeL-carousel-caption-glow text-base font-semibold sm:text-lg">
                                {item.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="easeL-carousel-hit absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0 touch-manipulation"
                        aria-label="Show next photo"
                        onClick={() => go(1)} />
                    </div>
                  </div>
                </div>
                <figcaption className="mt-4 mb-1 flex flex-wrap items-center justify-center gap-3">
                  <div className="flex gap-2" role="tablist" aria-label="Hero image slide">
                    {CAROUSEL_IMAGES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === slide}
                        aria-label={`Show image ${i + 1}`}
                        className="easeL-interactive h-3 w-3 rounded-full border-2"
                        style={{
                          borderColor: "var(--easeL-border-strong)",
                          background: i === slide ? "var(--easeL-primary)" : "transparent",
                        }}
                        onClick={() => setSlide(i)} />
                    ))}
                  </div>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <BrandMarquee />

        {/* Who we help */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-12 md:py-14"
          style={{
            background: "var(--easeL-bg-section-alt)",
            ["--enter-delay"]: "0.2s",
          }}
          aria-labelledby="easeL-who"
        >
          <div className="easeL-panel-inner min-w-0">
            <SectionHeader titleId="easeL-who" eyebrow={ur ? "کس کے لیے" : "Who we help"} title={ur ? "یہ کس کے لیے ہے" : "Who we serve"} />
            <ul className="mt-2 space-y-4 text-lg sm:text-xl" style={{ color: "var(--easeL-text-muted)" }}>
              <li className="flex gap-3">
                <CheckCircle2 className="h-7 w-7 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
                <span className={ur ? "ur" : ""}>{ur ? "بچے اور نوجوان جن کو cerebral palsy یا حرکت میں مشکل ہے۔" : "Children and adolescents with cerebral palsy or other motor impairments."}</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-7 w-7 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
                <span className={ur ? "ur" : ""}>{ur ? "خاندان اور نگہبان جو سیٹ اپ اور مشق میں مدد کرتے ہیں۔" : "Families and caregivers helping with device setup, prompts, and breaks."}</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-7 w-7 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
                <span className={ur ? "ur" : ""}>{ur ? "معالجین اور اساتذہ جو structured ڈرائنگ tool چاہتے ہیں۔" : "Therapists and educators who want a structured tracing and drawing tool."}</span>
              </li>
            </ul>
          </div>
        </section>

        {/* How control is designed — skill-style cards */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 pt-12 pb-7 md:pt-14 md:pb-8"
          style={{ ["--enter-delay"]: "0.26s", background: "var(--easeL-bg-section)" }}
          aria-labelledby="easeL-interaction"
        >
          <div className="easeL-panel-inner min-w-0">
            <SectionHeader
              titleId="easeL-interaction"
              eyebrow={ur ? "یہ کیسے کام کرتا ہے" : "How it works"}
              title={ur ? "control کا طریقہ" : "How control is designed"}
              subtitle={ur ? "سر کی ٹیڑھ سے navigation، محتاط activation، اور خودکار neutral position — CP کے سیکھنے والوں کے لیے موزوں۔" : "Tilt-led navigation, careful activation, and a neutral position that may drift — aligned with how many learners with CP already explore the screen."} />
            <div className="landing-interaction-grid mt-6 grid min-w-0 gap-5 sm:gap-6 md:grid-cols-3">
              {INTERACTION.map((item) => {
                const surface = item.tone === "coral" ? "coral" : item.tone === "ash" ? "mint" : "butter";
                const titleUr = item.visual === "tilt" ? "سر کا ٹیڑھا ہونا" : item.visual === "mouth" ? "منہ کھولنا" : "آرام کی پوزیشن";
                const textUr = item.visual === "tilt"
                  ? "cursor بائیں دائیں سر کے ٹیڑھے ہونے سے چلتا ہے، آنکھیں screen پر رہتی ہیں۔"
                  : item.visual === "mouth"
                    ? "منہ کا جان بوجھ کر کھلنا activation کے طور پر کام کر سکتا ہے۔"
                    : "سر کی آرام کی پوزیشن خودکار update ہوتی رہتی ہے تاکہ چھوٹی تبدیلی بھی کام کرے۔";
                return (
                  <article key={item.title} className={`easeL-landing-interaction-card easeL-landing-interaction-card--${surface} easeL-hoverable-card flex min-h-[12rem] min-w-0 flex-col p-5 sm:p-6 md:p-8`}>
                    <InteractionSpotArt variant={item.visual} />
                    <h3 className={`text-xl font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>{ur ? titleUr : item.title}</h3>
                    <p className={`mt-3 flex-1 text-base leading-relaxed sm:text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                      {ur ? textUr : item.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Learning paths — dusty analogous cards on warm paper band */}
        <section
          className="easeL-landing-paths-section landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 pt-7 pb-12 md:pt-8 md:pb-14"
          style={{ ["--enter-delay"]: "0.32s" }}
          aria-labelledby="easeL-modes"
        >
          <div className="easeL-panel-inner min-w-0">
            <SectionHeader
              titleId="easeL-modes"
              eyebrow={ur ? "راستے اور سبق" : "Paths & lessons"}
              title={ur ? "دو راستے، ایک واضح سیٹ اپ" : "Two learning paths, one clear setup"}
              subtitle={ur ? "ایک مختصر screener بہترین راستہ تجویز کرتا ہے۔ ہر راستے میں سطحیں اور سبق ہیں۔" : "A short in-app screener suggests the best path. Each path has levels and lessons; hard lessons split into steps so wins stay visible."} />
            <div className="mt-6 grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-2 lg:gap-7">
              {MODES.map((m) => {
                const isPath1 = m.pathVariant === "a";
                const nameUr = isPath1 ? "راستہ 1 — مدد کے ساتھ" : "راستہ 2 — guided control";
                const hookUr = isPath1 ? "جب مقصد کو سمجھنا ضروری ہو اور مدد زیادہ ہو۔" : "جب سیکھنے والا رہنمائی کے ساتھ tracing کے لیے تیار ہو۔";
                const bodyUr = isPath1
                  ? "راستہ 1 میں سطحیں اور سبق ہیں جہاں مقصد کو ترجیح دی جاتی ہے اور مدد زیادہ ہوتی ہے۔ مشکل سبق واضح مرحلوں میں تقسیم ہیں۔"
                  : "راستہ 2 میں سطحیں اور سبق guided control پر مرکوز ہیں۔ پیچیدہ شکلیں مرحلہ وار سکھائی جاتی ہیں تاکہ ترقی نظر آئے۔";
                const skillsUr = isPath1
                  ? ["مرحلہ وار سبق", "واضح feedback", "بڑھتی سطحیں"]
                  : ["بغیر ہاتھ ڈرائنگ", "شکل کے راستے", "نظر آنے والی کامیابی"];
                return (
                  <article
                    key={m.name}
                    className={`easeL-landing-path-card easeL-landing-path-card--${m.pathVariant} easeL-hoverable-card flex min-h-[14rem] min-w-0 flex-col p-5 sm:p-7 md:p-9`}
                  >
                    <h3 className={`text-2xl font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
                      {ur ? nameUr : m.name}
                    </h3>
                    <p className={`easeL-landing-path-hook mt-2 text-lg font-semibold leading-snug ${ur ? "ur" : ""}`}>{ur ? hookUr : m.hook}</p>
                    <p className={`mt-3 text-base leading-relaxed sm:text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                      {ur ? bodyUr : m.body}
                    </p>
                    <div
                      className="easeL-landing-path-footer mt-6 border-t pt-5"
                      style={{ borderColor: "var(--easeL-landing-path-footer-border)" }}
                    >
                      <p className={`easeL-landing-path-hook text-xs font-bold uppercase tracking-wide ${ur ? "ur normal-case" : ""}`}>
                        {ur ? "آپ مشق کریں گے" : "You will practise"}
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {(ur ? skillsUr : m.skills).map((sk) => (
                          <li key={sk}>
                            <span className={`easeL-landing-path-tag ${ur ? "ur" : ""}`}>{sk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why EaseL */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-12 md:py-14"
          style={{ ["--enter-delay"]: "0.38s", background: "var(--easeL-bg-section)" }}
          aria-labelledby="easeL-why"
        >
          <div className="easeL-panel-inner min-w-0">
            <SectionHeader
              titleId="easeL-why"
              eyebrow={ur ? "EaseL کیوں" : "Why EaseL"}
              title={ur ? "سنجیدہ مشق، خوشگوار انداز" : "Serious practice, joyful rhythm"}
              subtitle={ur ? "ایک طرف اعتماد، دوسری طرف توانائی اور کھیل — بغیر کسی بڑھا چڑھا کر کہے۔" : "The same job-to-be-done as movement-based learning brands: trust on one side, energy and play on the other — without overclaiming outcomes we do not measure."} />
            <div className="mt-8 grid min-w-0 gap-5 sm:gap-6 md:grid-cols-3">
              {WHY_EASEL.map((w) => {
                const Icon = w.icon;
                const titleUr = w.icon === Heart ? "مشق جو کھیل لگے" : w.icon === Shield ? "ہم کیا ہیں، اس میں واضح" : "اصل کمروں کے لیے";
                const textUr = w.icon === Heart
                  ? "tracing، راستے اور آزاد drawing screen time کو active بناتے ہیں — مختصر کوشش، واضح مقصد، ہر بار حوصلہ افزائی۔"
                  : w.icon === Shield
                    ? "EaseL ایک سیکھنے اور مشق کا tool ہے۔ یہ therapy یا طبی فیصلوں کی جگہ نہیں لیتا؛ خاندان اور team دیکھ بھال کے فیصلے خود کرتے ہیں۔"
                    : "Calibration اور tutorial سبق سے پہلے توقعات طے کرتے ہیں۔ یہ flow مستحکم screen، پہلی بار نگہبان کی مدد، اور تھکاوٹ پر وقفے کو مد نظر رکھتا ہے۔";
                return (
                  <article
                    key={w.title}
                    className="easeL-hoverable-card min-w-0 rounded-2xl border-2 bg-[color:var(--easeL-bg-section)] p-5 sm:p-6 md:p-7"
                    style={{ borderColor: "var(--easeL-landing-card-outline)" }}
                  >
                    <div
                      className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: "var(--easeL-bg-section-alt)" }}
                    >
                      <Icon className="h-6 w-6" style={{ color: "var(--easeL-primary)" }} />
                    </div>
                    <h3 className={`text-xl font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
                      {ur ? titleUr : w.title}
                    </h3>
                    <p className={`mt-3 text-base leading-relaxed ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                      {ur ? textUr : w.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sessions + disclaimer */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-12 md:py-14"
          style={{
            background: "var(--easeL-bg-page)",
            ["--enter-delay"]: "0.42s",
          }}
          aria-labelledby="easeL-sessions"
        >
          <div
            className="easeL-landing-static-raise easeL-panel-inner min-w-0 rounded-2xl border-2 bg-[color:var(--easeL-bg-section)] p-5 sm:rounded-3xl sm:p-8 md:p-10"
            style={{ borderColor: "var(--easeL-landing-card-outline)" }}
          >
            <SectionHeader
              titleId="easeL-sessions"
              eyebrow={ur ? "نگہبانوں کے لیے" : "For caregivers"}
              title={ur ? "سیشن، feedback، اور یہاں کامیابی کا مطلب" : "Sessions, feedback, and what success means here"}
            />
            <div className="mt-6 grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-2">
              <div className="min-w-0">
                <h3 className={`text-xl font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
                  {ur ? "Screen پر وقت" : "Time on screen"}
                </h3>
            <p className={`mt-3 text-base leading-relaxed sm:text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
              {ur
                ? "پہلے سیشن مختصر ہوتے ہیں — چند سے دس منٹ۔ لمبا کام تبھی مناسب ہے جب برداشت واضح ہو اور تھکاوٹ کے لیے وقفے ہوں۔ App لمبی مشق نہیں، مختصر کوشش کو ترجیح دیتی ہے۔"
                : "First sessions stay short — a few to ten minutes. Longer work only makes sense when tolerance is clear, with breaks for fatigue. The app favours brief tries, not long drills."}
            </p>
          </div>
          <div className="min-w-0">
            <h3 className={`text-xl font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
              {ur ? "حوصلہ افزائی، سرخ نشان نہیں" : "Reinforcement, not a red cross"}
            </h3>
            <p className={`mt-3 text-base leading-relaxed sm:text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
              {ur
                ? "مکمل کوشش کے بعد مثبت feedback ملتا ہے۔ حرکت کی غلطی کو ناکامی نہیں کہا جاتا — مقصد کوشش، توجہ اور خودمختاری ہے، نہ کہ بالکل سیدھی لکیر۔"
                : "Positive feedback follows completed attempts. Motor noise is not framed as public failure — the point is effort, focus, and agency, not a perfect line score."}
            </p>
          </div>
        </div>
        <div
          className="mt-8 min-w-0 rounded-2xl border-2 p-4 sm:p-5 md:p-6"
          style={{
            borderColor: "var(--easeL-landing-card-outline)",
            background: "var(--easeL-bg-card-coral)",
          }}
        >
          <p className={`text-base font-semibold sm:text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
            {ur
              ? "EaseL یہ دعویٰ نہیں کرتا کہ وہ CP کا علاج کرتا ہے، motor curve بدلتا ہے، یا ذہنی عمر ناپتا ہے۔ یہ ایک سیکھنے اور مشق کا tool ہے؛ طبی فیصلے خاندان اور care team کے پاس رہتے ہیں۔"
              : "EaseL does not claim to treat CP, reshape a fixed motor curve on demand, or measure \"mental age.\" It is a learning and practice tool; medical decisions stay with families and care teams."}
          </p>
        </div>
      </div>
    </section>

        {/* Privacy row */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-12 md:py-14"
          style={{ ["--enter-delay"]: "0.48s", background: "var(--easeL-bg-section-alt)" }}
        >
          <div className="easeL-panel-inner grid min-w-0 gap-5 lg:grid-cols-2">
            <section
              className="min-w-0 rounded-2xl border-2 p-5 sm:p-6 md:p-8"
              style={{
                background: "var(--easeL-bg-section)",
                borderColor: "var(--easeL-landing-card-outline)",
              }}
              aria-labelledby="easeL-privacy"
            >
              <div className="mb-3 flex items-center gap-2">
                <Camera className="h-7 w-7" style={{ color: "var(--easeL-primary)" }} />
                <h2 id="easeL-privacy" className={`text-2xl font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
                  {ur ? "Camera اور ڈیٹا" : "Camera and data"}
                </h2>
              </div>
              <p className={`text-base leading-relaxed sm:text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                {ur
                  ? "Camera کی video browser میں process ہوتی ہے تاکہ interaction چلے؛ ڈیزائن کا مقصد ہے کہ stored data کم سے کم ہو اور raw video کسی recording app کی طرح محفوظ نہ ہو۔ Export صرف وہ metrics ہیں جن سے نگہبان مطمئن ہو — خاموش upload نہیں۔"
                  : "Video from the camera is processed in the browser to drive interaction; the design is to keep derived data minimal and to avoid storing raw video the way a recording app would. Export is for metrics a caregiver is comfortable with, not silent upload."}
              </p>
            </section>
            <section
              className="min-w-0 rounded-2xl border-2 p-5 sm:p-6 md:p-8"
              style={{
                background: "var(--easeL-bg-cream)",
                borderColor: "var(--easeL-landing-card-outline)",
              }}
              aria-labelledby="easeL-caregiver-note"
            >
              <div className="mb-3 flex items-center gap-2">
                <UserRound className="h-7 w-7" style={{ color: "var(--easeL-primary)" }} />
                <h2 id="easeL-caregiver-note" className={`text-2xl font-bold ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text)" }}>
                  {ur ? "پہلی بار سیٹ اپ" : "First-time setup"}
                </h2>
              </div>
              <p className={`text-base leading-relaxed sm:text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                {ur
                  ? "پہلی بار مدد کی توقع ہے: account، device کی جگہ، اور prompts پڑھنا اگر سیکھنے والے کو جانی پہچانی آواز سے فائدہ ہو۔ اردو سمیت زبانیں اور icon-first screens اس کام کا حصہ ہیں۔"
                  : "The flow expects help the first time: account, device placement, and reading prompts if the learner does best with a familiar voice. Optional languages (including Urdu where implemented) and icon-first screens are part of the direction of the work."}
              </p>
              <ul className={`mt-4 space-y-2 text-lg ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-muted)" }}>
                <li className="flex gap-2">
                  <Monitor className="h-6 w-6 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
                  {ur ? "مستحکم میز اور اتنی بڑی screen استعمال کریں کہ targets صاف نظر آئیں۔" : "Use a stable table and a screen large enough to see targets clearly."}
                </li>
                <li className="flex gap-2">
                  <BookOpen className="h-6 w-6 shrink-0" style={{ color: "var(--easeL-accent-mint)" }} />
                  {ur ? "Tutorial اصل سبق سے پہلے tilt اور activation سے متعارف کراتا ہے۔" : "Tutorial introduces tilt and activation before real lessons."}
                </li>
              </ul>
            </section>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-12 md:py-14"
          style={{ ["--enter-delay"]: "0.52s", background: "var(--easeL-bg-section)" }}
          aria-labelledby="easeL-faq"
        >
          <div className="easeL-panel-inner max-w-3xl min-w-0">
            <SectionHeader
              titleId="easeL-faq"
              eyebrow="FAQ"
              title={ur ? "عام سوالات" : "Common questions"}
              subtitle={ur ? "مختصر جوابات — طبی اور علاجی مقاصد کے ماہر آپ کی care team ہی رہتی ہے۔" : "Short answers — your care team stays the expert on medical and therapeutic goals."}
            />
            <div className="mt-6 space-y-2">
              {FAQ_ITEMS.map((item, index) => {
                const panelId = `${faqBaseId}-faq-${index}`;
                const isOpen = faqOpen === index;
                const qUr = ["EaseL کیا ہے؟", "یہ کس کے لیے ہے؟", "Account بنانے کے بعد کیا ہوتا ہے؟", "کیا EaseL video record کرتا ہے؟"][index] ?? item.q;
                const aUr = [
                  "EaseL ایک browser-based app ہے جس میں head-tracked drawing اور guided سبق ہیں۔ بچے بغیر ہاتھ کے راستے اور شکلیں practice کرتے ہیں؛ نگہبان سیٹ اپ کے بعد ترقی دیکھ سکتے ہیں۔",
                  "وہ بچے اور نوجوان جن کو cerebral palsy یا دوسری motor مشکلات ہیں اور جو سر کے ٹیڑھے پن سے cursor control کر سکتے ہیں — نیز ان کے خاندان، اساتذہ اور معالجین۔",
                  "آپ sign-up، calibration، مختصر tutorial، اور path screener سے گزرتے ہیں۔ App پھر راستہ 1 یا 2 تجویز کرتی ہے اور اس کے مطابق سبق، canvas، اور gallery کھولتی ہے۔",
                  "Video browser میں process ہوتی ہے تاکہ interaction چلے۔ ڈیزائن کا مقصد stored data کو کم رکھنا ہے — مزید تفصیل Camera section میں دیکھیں۔",
                ][index] ?? item.a;
                return (
                  <div
                    key={item.q}
                    className="min-w-0 rounded-2xl border-2 bg-[color:var(--easeL-bg-section)]"
                    style={{ borderColor: "var(--easeL-landing-card-outline)" }}
                  >
                    <h3 className="m-0 min-w-0 text-base font-bold sm:text-lg">
                      <button
                        type="button"
                        id={`${panelId}-btn`}
                        className="easeL-interactive flex w-full min-w-0 items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
                        style={{ color: "var(--easeL-text)" }}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setFaqOpen(isOpen ? null : index)}
                      >
                        <span className={`min-w-0 flex-1 pr-2 ${ur ? "ur" : ""}`}>{ur ? qUr : item.q}</span>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 transition-transform"
                          style={{
                            color: "var(--easeL-primary)",
                            transform: isOpen ? "rotate(180deg)" : undefined,
                          }}
                          aria-hidden
                        />
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={`${panelId}-btn`}
                      className="border-t px-5 pb-4 pt-0 text-base leading-relaxed"
                      style={{
                        borderColor: "var(--easeL-border-subtle)",
                        color: "var(--easeL-text-muted)",
                        display: isOpen ? "block" : "none",
                      }}
                    >
                      <p className={`mt-3 ${ur ? "ur" : ""}`}>{ur ? aUr : item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="landing-enter easeL-full-bleed-panel easeL-panel-divider mt-0 py-12 md:py-14"
          style={{
            background: "var(--easeL-primary)",
            color: "var(--easeL-text-on-dark)",
            ["--enter-delay"]: "0.58s",
          }}
        >
          <div className="easeL-panel-inner min-w-0 px-4 py-8 sm:p-8 md:p-12">
            <p className="easeL-landing-eyebrow" style={{ color: "color-mix(in srgb, white 82%, var(--easeL-primary-mid))" }}>
              {ur ? "اگلا قدم" : "Next step"}
            </p>
            {isAuthenticated ? (
              <>
                <h2 className={`font-easeL-display text-3xl sm:text-4xl ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-on-dark)" }}>
                  {ur ? "خوش آمدید — جہاں چھوڑا وہاں سے شروع کریں۔" : "Welcome back — pick up where you left off."}
                </h2>
                <p className={`mt-4 max-w-2xl text-lg sm:text-xl ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-on-dark-muted)" }}>
                  {ur ? "آپ کی ترقی، سبق اور gallery آپ کا انتظار کر رہی ہے۔" : "Your progress, lessons, and gallery are waiting for you."}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    to="/home"
                    className="easeL-interactive inline-flex min-h-14 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border-2 px-8 text-lg font-semibold sm:w-auto sm:min-w-[10rem]"
                    style={{
                      color: "var(--easeL-text-on-dark)",
                      borderColor: "var(--easeL-text-on-dark)",
                      background: "color-mix(in srgb, white 14%, transparent)",
                    }}
                  >
                    <span className={ur ? "ur" : ""}>{ur ? "ڈیش بورڈ پر جائیں" : "Go to dashboard"}</span>
                    <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                  </Link>
                  <Link
                    to="/lessons"
                    className="easeL-interactive inline-flex min-h-14 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border-2 px-7 text-lg font-semibold sm:w-auto sm:min-w-[12rem]"
                    style={{
                      color: "var(--easeL-text-on-dark)",
                      borderColor: "color-mix(in srgb, white 55%, transparent)",
                      background: "transparent",
                    }}
                  >
                    <span className={ur ? "ur" : ""}>{ur ? "سبق جاری رکھیں" : "Continue lessons"}</span>
                    <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className={`font-easeL-display text-3xl sm:text-4xl ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-on-dark)" }}>
                  {ur ? "سیٹ اپ شروع کرنے کے لیے تیار ہیں؟" : "Ready to try the setup flow?"}
                </h2>
                <p className={`mt-4 max-w-2xl text-lg sm:text-xl ${ur ? "ur" : ""}`} style={{ color: "var(--easeL-text-on-dark-muted)" }}>
                  {ur
                    ? "Account بنائیں اور calibration، tutorial، اور path assignment سے گزریں۔ ترقی راستہ، سطح، سبق اور مرحلے کے طور پر نظر آتی ہے۔"
                    : "Create an account to walk through calibration, tutorial, and path assignment. Progress appears as path, level, lesson, and step."}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    to="/signup"
                    className="easeL-interactive inline-flex min-h-14 w-full min-w-0 items-center justify-center rounded-2xl border-2 px-8 text-lg font-semibold sm:w-auto sm:min-w-[10rem]"
                    style={{
                      color: "var(--easeL-text-on-dark)",
                      borderColor: "var(--easeL-text-on-dark)",
                      background: "color-mix(in srgb, white 14%, transparent)",
                    }}
                  >
                    <span className={ur ? "ur" : ""}>{ur ? "Account بنائیں" : "Create account"}</span>
                  </Link>
                  <Link
                    to="/login"
                    className="easeL-interactive inline-flex min-h-14 w-full min-w-0 items-center justify-center rounded-2xl border-2 px-7 text-lg font-semibold sm:w-auto sm:min-w-[12rem]"
                    style={{
                      color: "var(--easeL-text-on-dark)",
                      borderColor: "color-mix(in srgb, white 55%, transparent)",
                      background: "transparent",
                    }}
                  >
                    <span className={ur ? "ur" : ""}>{ur ? "میرا account پہلے سے ہے" : "I already have an account"}</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
