# Audio Accessibility Features

## Overview

The app now has complete audio accessibility features that announce:
1. **All interactive buttons** when head cursor hovers over them
2. **Full Urdu and English instructions** for every lesson
3. **Real-time announcements** as you navigate with head tilt

## How It Works

### Button Announcements (Head Cursor Hover)

When you move the head cursor (via head tilt) over ANY button, the app will speak it aloud:

**English Example:**
- Hover over "Continue path" button → Hears: "Continue path"
- Hover over "Open Lessons" button → Hears: "Open Lessons"
- Hover over "Progress" button → Hears: "Progress"

**Urdu Example:**
- Hover over "سبق کھولیں" (Open Lessons) → Hears the button text in Urdu
- Hover over "کینوس کھولیں" (Open Canvas) → Hears in Urdu
- Hover over "گیلری دیکھیں" (View Gallery) → Hears in Urdu

### Lesson Instructions (Auto-Spoken)

When a lesson starts:

**Stage 0 (Direction Basics):**
- Demo: "Watch me first" → "Move left" / "Move right" / "Move up" / "Move down"
- Full Urdu: "پہلے میری طرف دیکھیں۔" → "بائیں طرف حرکت دیں۔"

**Stage 1 (Hold Still):**
- Demo: "Watch me first" → "Hold your head as still as you can"
- Full Urdu: "پہلے میری طرف دیکھیں۔" → "دائرے پر سر کو ساکن رکھیں۔"

**Stage 2+ (Tracing):**
- Demo: "Watch me first" → "Tilt your head toward the shape"
- Trial: "Open your mouth to start" (fully spoken in Urdu)

### Toolbar Button Announcements in Lessons

When hovering over lesson toolbar buttons with head cursor:
- Mute button
- Recenter button  
- Exit button
- Any other interactive elements

All announced in your selected language (English or Urdu).

## Implementation Details

### Audio Announcer (`audioAnnouncer.js`)

- **Queues announcements** to prevent overlapping speech
- **Smart voice selection** - picks Urdu voice if available, falls back to Hindi, then English
- **Handles voice loading delays** - waits for system voices to load
- **Full error handling** - gracefully continues if speech synthesis fails
- **Language support** - Urdu (ur-PK) and English (en-US)

### Button Text Extraction

The system extracts announcement text from buttons in this order:
1. `aria-label` attribute (for screen readers)
2. `title` attribute
3. `data-announce` attribute (custom announcements)
4. Button text content
5. Nearby labeled elements

### Speech Rate

- **Urdu**: 0.95 speed (slightly slower for clarity)
- **English**: 0.95 speed (normal, clear delivery)
- **Volume**: Always maximum (1.0)

## Browser Requirements

- Modern browser with Web Speech API support
- Urdu TTS voice (optional - English fallback available)
- Microphone access (for head cursor tracking only)

### Supported Browsers

- Chrome/Chromium ✓
- Firefox ✓
- Safari ✓ (Urdu support varies by macOS version)
- Edge ✓

## Testing the Feature

1. **On Home page:**
   - Open the app
   - Tilt your head to move the cursor over buttons
   - You should hear: "Continue path", "Progress", "Open Lessons", "Open Canvas", "View Gallery"

2. **In Lessons:**
   - Start a lesson (any stage)
   - You should hear the demo instruction in your selected language
   - Hover toolbar buttons (mute, recenter, exit)
   - You should hear each button name as you hover

3. **Language Testing:**
   - Change language in Settings to Urdu
   - Repeat above steps
   - All announcements should be in Urdu

## Troubleshooting

### Can't hear button announcements?

1. Check browser volume - make sure not muted
2. Check app mute toggle in lesson toolbar
3. Try a different browser (Chrome is most reliable)
4. Check system Text-to-Speech settings

### Urdu not being spoken?

1. System may not have Urdu voice installed
2. App will use English fallback automatically
3. To add Urdu voice:
   - **Mac**: System Preferences → Accessibility → Spoken Content → Add Urdu
   - **Windows**: Settings → Time & Language → Speech → Add language
   - **Linux**: Install espeak-ng or festival with Urdu support

### Speech cuts off?

1. Try refreshing the page
2. Make sure no other app is using speech synthesis
3. Try a different browser

## Accessibility Best Practices

- **Always keep app volume at comfortable level**
- **Don't mute if using announcements**
- **In noisy environments**, sit closer to screen for better audio
- **Test your browser's TTS first** - go to Settings → Accessibility → Spoken Content

## Future Enhancements

- [ ] Speed control for announcements
- [ ] Custom voice selection UI
- [ ] Announcement history log
- [ ] Non-intrusive sound effects instead of beeps
