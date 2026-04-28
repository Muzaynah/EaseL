import { useEffect, useState } from "react";
import { Info } from "lucide-react";

/**
 * Brief per-stage instruction card that appears when the trial begins, then
 * auto-dismisses after a few seconds.  Shown a maximum of MAX_SHOWINGS times
 * per (mode, stage) pair, tracked in localStorage — first run it's a teach,
 * second run it's a reminder, after that the user knows and we stay out of
 * their way.  Framework §8.4: icon-first with optional audio; here we keep
 * the copy short and pair it with an icon so non-readers still parse it.
 *
 * Dismisses on:
 *   - timeout (default 4.5 s)
 *   - any click
 *   - external signal (parent updates the `dismissSignal` prop when the user
 *     starts drawing, so the card doesn't block their first pen-toggle)
 */

const MAX_SHOWINGS = 2;

const COPY = {
  0: {
    en: "Tilt your head side to side. The line grows as you move.",
    ur: "سر کو دائیں بائیں ہلائیں۔ حرکت کے ساتھ لکیر بڑھے گی۔",
  },
  1: {
    en: "Hold your head as still as you can on the circle.",
    ur: "دائرے پر سر کو ساکن رکھیں۔",
  },
  2: {
    en: "Move your head and watch the line complete. Mouth open is optional here.",
    ur: "سر کو حرکت دیں اور لکیر مکمل ہوتے دیکھیں۔ یہاں منہ کھولنا لازمی نہیں۔",
  },
  3: {
    en: "Open your mouth to start, then tilt to follow the dotted line.",
    ur: "شروع کے لیے منہ کھولیں، پھر نقطوں والی لکیر پر چلیں۔",
  },
  4: {
    en: "Curve your head up and back down, smooth and slow.",
    ur: "سر کو آرام سے اوپر اور نیچے گھمائیں۔",
  },
  5: {
    en: "Each side is its own stroke. Open your mouth at the start and end of each side.",
    ur: "ہر سمت ایک الگ لکیر ہے۔ ہر سمت کے آغاز اور اختتام پر منہ کھولیں۔",
  },
  6: {
    en: "Trace each part one at a time. A little rest between sides is fine.",
    ur: "ہر حصے کو باری باری بنائیں۔ درمیان میں ذرا توقف ٹھیک ہے۔",
  },
};

function storageKey(mode, stage) {
  return `easeL_lesson_intro_seen_${mode}_${stage}`;
}

function readSeenCount(mode, stage) {
  try {
    const raw = localStorage.getItem(storageKey(mode, stage));
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function incrementSeenCount(mode, stage) {
  try {
    const next = readSeenCount(mode, stage) + 1;
    localStorage.setItem(storageKey(mode, stage), String(next));
  } catch {
    // storage disabled; UX-only, fine to ignore
  }
}

export default function LessonInstructionCard({
  stage,
  mode,
  language = "en",
  active,
  durationMs = 4500,
  dismissSignal,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }
    const seen = readSeenCount(mode, stage);
    if (seen >= MAX_SHOWINGS) return undefined;
    setVisible(true);
    incrementSeenCount(mode, stage);
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [active, mode, stage, durationMs]);

  useEffect(() => {
    if (dismissSignal) setVisible(false);
  }, [dismissSignal]);

  if (!visible) return null;

  const copy = COPY[stage]?.[language] ?? COPY[stage]?.en ?? "";
  if (!copy) return null;

  return (
    <button
      type="button"
      onClick={() => setVisible(false)}
      className="fixed left-1/2 top-28 z-40 -translate-x-1/2 max-w-[560px] w-[90%] px-6 py-4 rounded-3xl bg-white/95 backdrop-blur-md border-2 border-indigo-300 shadow-2xl text-left animate-fade-scale-in"
      aria-label="Dismiss instruction"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
          <Info className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">
            {language === "ur" ? "ہدایت" : "How to play"}
          </p>
          <p className="text-slate-800 text-base font-medium leading-snug">{copy}</p>
        </div>
      </div>
    </button>
  );
}
