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

let voicesCache = [];

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache;
}

// Initialize voices on page load
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
  loadVoices();
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
    // Don't cancel immediately - let current speech finish naturally
    // Only cancel if we're starting a new instruction
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const u = new SpeechSynthesisUtterance(text);
    u.rate = language === "ur" ? 1.0 : 0.9;
    u.pitch = 1.0;
    u.volume = 1.0;

    // Get fresh voices, or use cache if empty
    let voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      voices = voicesCache;
    }
    if (!voices || voices.length === 0) {
      // Emergency fallback: try loading again with delay
      setTimeout(() => {
        const retryVoices = window.speechSynthesis.getVoices();
        if (retryVoices && retryVoices.length > 0) {
          selectVoiceAndSpeak(u, retryVoices, language, onEnd);
        } else {
          // Just speak without voice selection
          u.onend = () => onEnd?.();
          window.speechSynthesis.speak(u);
        }
      }, 100);
      return;
    }

    selectVoiceAndSpeak(u, voices, language, onEnd);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

function selectVoiceAndSpeak(u, voices, language, onEnd) {
  const preferred =
    language === "ur"
      ? voices.find((v) => v.lang?.toLowerCase().startsWith("ur")) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("en"))
      : voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("en-us"));

  if (preferred) {
    u.voice = preferred;
    u.lang = preferred.lang;
  } else {
    u.lang = language === "ur" ? "ur-PK" : "en-US";
  }

  u.onend = () => onEnd?.();
  u.onerror = (e) => {
    console.warn("Speech synthesis error:", e);
    onEnd?.();
  };

  if (window.speechSynthesis) {
    window.speechSynthesis.speak(u);
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
  moveLeft: {
    en: "Move left.",
    ur: "بائیں طرف حرکت دیں۔",
  },
  moveRight: {
    en: "Move right.",
    ur: "دائیں طرف حرکت دیں۔",
  },
  moveUp: {
    en: "Move up.",
    ur: "اوپر حرکت دیں۔",
  },
  moveDown: {
    en: "Move down.",
    ur: "نیچے حرکت دیں۔",
  },
  excellent: {
    en: "Excellent work!",
    ur: "شاندار کام!",
  },
  wellDone: {
    en: "Well done!",
    ur: "خوب رہا!",
  },
  keepGoing: {
    en: "Keep going!",
    ur: "جاری رکھیں!",
  },
  traceCircle: {
    en: "Trace the circle.",
    ur: "دائرے کو ٹریس کریں۔",
  },
  traceSquare: {
    en: "Trace the square.",
    ur: "مربع کو ٹریس کریں۔",
  },
  traceTriangle: {
    en: "Trace the triangle.",
    ur: "مثلث کو ٹریس کریں۔",
  },
  drawSun: {
    en: "Draw the sun.",
    ur: "سورج بنائیں۔",
  },
  drawKite: {
    en: "Draw the kite.",
    ur: "پتنگ بنائیں۔",
  },
  drawHouse: {
    en: "Draw the house.",
    ur: "مکان بنائیں۔",
  },
  masteryCongrats: {
    en: "You've mastered this!",
    ur: "آپ نے یہ سیکھ لیا!",
  },
  nextLevel: {
    en: "Ready for the next level?",
    ur: "اگلے درجے کے لیے تیار ہیں؟",
  },
  getReady: {
    en: "Get ready.",
    ur: "تیار ہو جائیں۔",
  },
  startTracing: {
    en: "Start tracing.",
    ur: "ٹریسنگ شروع کریں۔",
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
