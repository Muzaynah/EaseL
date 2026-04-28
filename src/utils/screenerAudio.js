/**
 * Audio feedback for the path assignment screener: success beep and spoken instructions.
 * Uses Web Audio API for the beep (no assets) and Speech Synthesis for instructions.
 */
import sparkleSfx from "../assets/audio/sparkle.mp3";

let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

/**
 * Play a short success beep (pleasant tone).
 */
export function playSuccessBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // Ignore audio failures on browsers/devices that restrict autoplay.
  }
}

/**
 * Sparkle clip for Path 2 result screen (from `src/assets/audio/sparkle.mp3`).
 */
export function playCheerSound() {
  if (typeof window === "undefined") return;
  try {
    const a = new Audio(sparkleSfx);
    a.volume = 0.9;
    const p = a.play();
    if (p && typeof p.catch === "function") void p.catch(() => {});
  } catch {
    // Autoplay or decode restrictions
  }
}

/**
 * Play a short error beep (lower, more urgent tone) for wrong action feedback.
 */
export function playErrorBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.1);
    osc.type = "sawtooth";
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Ignore audio failures on browsers/devices that restrict autoplay.
  }
}

/**
 * Speak instruction text using the browser's speech synthesis.
 * Supports English and Urdu (framework §8.4) — if an Urdu voice is not
 * available on the host system we fall back to English, which is the safe
 * behaviour for a PWA used across unknown environments.
 *
 * @param {string} text
 * @param {{ onEnd?: () => void, language?: 'en' | 'ur' }} options
 */
export function speakInstruction(text, { onEnd, language = "en" } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = language === "ur" ? 0.85 : 0.7;
    u.pitch = 1;
    u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      language === "ur"
        ? voices.find((v) => v.lang?.toLowerCase().startsWith("ur")) ||
          voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ||
          voices.find((v) => v.lang?.toLowerCase().startsWith("en"))
        : voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    if (preferred) u.voice = preferred;
    u.lang = preferred?.lang ?? (language === "ur" ? "ur-PK" : "en-US");
    u.onend = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } catch {
    // Speech synthesis availability varies by browser/OS.
  }
}

/**
 * Small phrase-book for spoken cues used across lessons. Falls back to English
 * when Urdu voices are not installed.
 */
export const PHRASES = {
  tiltTowardTarget: {
    en: "Tilt your head toward the shape.",
    ur: "اپنا سر شکل کی طرف جھکائیں۔",
  },
  holdStill: {
    en: "Hold still.",
    ur: "تھوڑی دیر رکیے۔",
  },
  openMouth: {
    en: "Open your mouth to start.",
    ur: "شروع کرنے کے لیے منہ کھولیں۔",
  },
  trace: {
    en: "Trace the dotted line.",
    ur: "نقطوں والی لکیر پر چلیں۔",
  },
  watchMe: {
    en: "Watch me first.",
    ur: "پہلے میری طرف دیکھیں۔",
  },
  goodTry: {
    en: "Great try.",
    ur: "بہت اچھا۔",
  },
  allDone: {
    en: "All done. Wonderful.",
    ur: "بہت خوب۔ مکمل ہو گیا۔",
  },
};

export function sayPhrase(key, language = "en", opts = {}) {
  const p = PHRASES[key];
  if (!p) return;
  speakInstruction(p[language] ?? p.en, { language, ...opts });
}

/**
 * Stop any current speech.
 */
export function stopSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
