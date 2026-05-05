/**
 * Robust audio announcer for all UI elements.
 * Handles announcements for buttons, instructions, and interactive elements.
 * Supports English and Urdu with proper voice selection and fallback.
 */

let speechSynthesis = null;
let lastAnnouncedElement = null;
let announcementQueue = [];
let isProcessingQueue = false;

function initSpeech() {
  if (typeof window === "undefined") return false;
  speechSynthesis = window.speechSynthesis;
  return !!speechSynthesis;
}

// Initialize on module load
const hasSpeech = initSpeech();

/**
 * Get the text that should be announced for an element
 */
export function getElementAnnouncement(element, language = "en") {
  if (!element) return null;

  // Check aria-label first
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // Check title attribute
  const title = element.getAttribute("title");
  if (title) return title;

  // Check data-announce attribute
  const announce = element.getAttribute("data-announce");
  if (announce) return announce;

  // Extract text content from button/link
  let text = element.textContent?.trim();
  if (text && text.length < 100) return text;

  // Try to find descriptive text in nearby elements
  const nearby = element.querySelector("[data-announce], [aria-label]");
  if (nearby) {
    return nearby.getAttribute("aria-label") || nearby.getAttribute("data-announce");
  }

  return null;
}

/**
 * Queue an announcement to be spoken
 */
function queueAnnouncement(text, language = "en") {
  if (!text || !hasSpeech) return;

  announcementQueue.push({ text, language });
  processQueue();
}

/**
 * Process the announcement queue one at a time
 */
async function processQueue() {
  if (isProcessingQueue || announcementQueue.length === 0) return;

  isProcessingQueue = true;
  const { text, language } = announcementQueue.shift();

  try {
    await speakText(text, language);
  } catch (err) {
    console.warn("Announcement error:", err);
  }

  isProcessingQueue = false;

  // Process next in queue
  if (announcementQueue.length > 0) {
    processQueue();
  }
}

/**
 * Speak text with proper voice selection and language support
 */
function speakText(text, language = "en") {
  return new Promise((resolve) => {
    if (!speechSynthesis) {
      resolve();
      return;
    }

    try {
      // Cancel any current speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Language-specific settings
      if (language === "ur") {
        utterance.rate = 0.95; // Slightly slower for Urdu clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = "ur-PK";
      } else {
        utterance.rate = 0.95; // Normal speed
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = "en-US";
      }

      // Get voices with retry
      let voices = speechSynthesis.getVoices();

      if (voices.length === 0) {
        // Voices not loaded, wait a bit
        setTimeout(() => {
          voices = speechSynthesis.getVoices();
          selectVoice(utterance, voices, language);
          speakUtterance(utterance, resolve);
        }, 100);
        return;
      }

      selectVoice(utterance, voices, language);
      speakUtterance(utterance, resolve);
    } catch (err) {
      console.warn("Speech error:", err);
      resolve();
    }
  });
}

function selectVoice(utterance, voices, language) {
  if (!voices || voices.length === 0) return;

  let selectedVoice = null;

  if (language === "ur") {
    // Try Urdu first
    selectedVoice = voices.find((v) => v.lang?.toLowerCase().includes("ur"));
    // Fallback to Hindi (similar language)
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => v.lang?.toLowerCase().includes("hi"));
    }
    // Fallback to English
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => v.lang?.toLowerCase().includes("en"));
    }
  } else {
    // English first
    selectedVoice = voices.find((v) => v.lang?.toLowerCase().includes("en"));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
}

function speakUtterance(utterance, resolve) {
  utterance.onend = resolve;
  utterance.onerror = (event) => {
    console.warn("Speech synthesis error:", event);
    resolve();
  };

  try {
    speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Could not speak:", err);
    resolve();
  }
}

/**
 * Announce when user hovers over an element with head cursor
 */
export function announceElement(element, language = "en") {
  // Don't announce same element twice
  if (element === lastAnnouncedElement) return;

  lastAnnouncedElement = element;

  const text = getElementAnnouncement(element, language);
  if (text) {
    queueAnnouncement(text, language);
  }
}

/**
 * Clear announcement (e.g., when cursor leaves element)
 */
export function clearAnnouncement() {
  lastAnnouncedElement = null;
  // Don't cancel speech, just stop tracking
}

/**
 * Speak a full instruction immediately
 */
export function announceInstruction(text, language = "en") {
  if (!text) return;
  queueAnnouncement(text, language);
}

/**
 * Stop all speech
 */
export function stopAnnouncement() {
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
  announcementQueue = [];
  isProcessingQueue = false;
  lastAnnouncedElement = null;
}

// Listen for voices to load
if (hasSpeech && speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => {
    // Voices loaded, ready to speak
  };
}
