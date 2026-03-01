/**
 * Audio feedback for the LIP Screener: success beep and spoken instructions.
 * Uses Web Audio API for the beep (no assets) and Speech Synthesis for instructions.
 */

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
  } catch (_) {}
}

/**
 * Speak instruction text using the browser's speech synthesis.
 * @param {string} text
 * @param {{ onEnd?: () => void }} options
 */
export function speakInstruction(text, { onEnd } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.7;
    u.pitch = 1;
    u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => v.lang.startsWith("en"));
    if (en) u.voice = en;
    u.onend = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

/**
 * Stop any current speech.
 */
export function stopSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
