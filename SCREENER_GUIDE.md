# PathScreener Guide — How to Perform the LIP Assignment

This guide explains **how to demonstrate and administer the LIP (Learning-Interaction Profile) Screener** to assign a user to **Path 1 (Intent Capture)** or **Path 2 (Guided Control)**.

## Overview

The screener assesses 5 micro-tasks over ~3–5 minutes. It measures:
- **S1**: Cause→Effect engagement (can user see head tilt moves cursor?)
- **S2**: Hold stability (can user hold cursor in target for 5 seconds?)
- **S3**: Activation reliability (can user open mouth / click 5 times reliably?)
- **S4**: Corridor tracing (can user move cursor left→right inside a strip?)
- **S5**: Fatigue index (does S2 performance drop later in screener?)

## Access the Screener

1. Log into EaseL as a caregiver
2. Navigate to **Profile** (avatar, top right) → **Settings**
3. Look for **"Run LIP Screener"** button or visit `/path-screener` URL directly
4. The screener will play audio instructions and guide through 5 steps

## How to Administer — Step-by-Step

### Before You Start
- Ensure **good lighting** on the child's face (avoid backlighting)
- Laptop/desktop with **working webcam**
- Quiet environment so audio is clear
- Child is **comfortable and alert** (not tired)
- Device propped at eye level so child can look at screen naturally

### Step 1: Cause→Effect (10 seconds)
**Goal**: Confirm child can see that head tilt moves the cursor.

**What to do**:
1. App shows a green **Start button** in the middle of the screen
2. **Audio**: "Put the cursor on the green Start button. Open your mouth or click to press it."
3. Gently guide child to **tilt head left/right** so they see the cursor move
4. Once child understands, they **open mouth or click** to press the Start button
5. System records reaction time (ms from button appearance to press)

**Success**: Child presses Start button → move to Step 2

---

### Step 2: Hold Stability (5 seconds dwell)
**Goal**: Can child hold cursor still inside a circle for 5 seconds?

**What to do**:
1. App shows a large **purple dashed circle** in the middle
2. **Audio**: "Keep the cursor inside the circle for 5 seconds."
3. Child must **tilt head to move cursor into the circle** and **keep it there**
4. A progress arc fills as they hold (similar to a timer)
5. After 5 continuous seconds inside, task passes

**Success indicators**:
- ✅ Cursor stays in circle for 5 sec → move to Step 3
- ❌ Falls out multiple times or can't hold → app gives feedback, child retries (max 3 times)
- ❌ After 3 failed attempts → **FAIL LEVEL** (screener ends; assign Path 1 with extra support)

**System measures**:
- Time taken to enter circle
- Re-entry count (how many times they left and came back)
- Jitter (tilt velocity variance — smoothness of movement)

---

### Step 3: Activation Reliability (5 circles, select all)
**Goal**: Does mouth-opening or clicking work reliably?

**What to do**:
1. App shows **5 numbered circles** scattered on screen
2. **Audio**: "Select each circle. Put the cursor on a circle, then open your mouth or click."
3. Child must **move cursor onto each circle** one at a time and **activate** (open mouth or click)
4. Each successful selection lights up or disappears
5. Child must select all 5

**Success**:
- ✅ All 5 selected cleanly → move to Step 4
- ❌ Lots of false activations (mouth opening when not intended) → system notes this; may recommend **dwell fallback** instead of mouth-open later

**System measures**:
- True activation rate (correct intent)
- False positive rate (accidental activations)
- Missed activations (intended but didn't register)

---

### Step 4: Corridor Tracing (left→right)
**Goal**: Can child trace a path and stay roughly inside a corridor (corridor assist)?

**What to do**:
1. App shows a **horizontal strip** (corridor) across the middle of screen
2. **Audio**: "Move the cursor from the left to the right. Stay inside the strip."
3. Child tilts head to move cursor **from left to right**, staying inside the strip
4. Cursor is initially snapped to the left edge; child guides it across
5. System tracks how many points are inside vs. outside the corridor

**Success**:
- ✅ Reaches the right side with good adherence (≥60% inside) → move to Step 5
- ❌ Lots of off-corridor wandering OR goes out of bounds → **FAIL LEVEL** (screener may end; assign Path 1)

**System measures**:
- Adherence: % of points inside corridor
- Mean deviation: average distance from corridor centerline
- Out-of-bounds count: times cursor left play area entirely

---

### Step 5: Fatigue Index (2 rounds, 5 circles each)
**Goal**: Does child's performance hold up or degrade as session progresses?

**What to do**:
1. **Round 1 (5 circles)**: Same as Step 3 — select 5 circles quickly
   - **Audio**: "Select the 3 circles. Round one."
2. App records time and accuracy
3. Child takes a brief natural pause (app is ready for Round 2)
4. **Round 2 (5 circles)**: Select 5 circles again
   - **Audio**: "Round two."

**System measures**:
- Time in Round 1 (ms)
- Time in Round 2 (ms)
- **Fatigue Index**: (Time1 - Time2) / Time1
  - High fatigue = user slows down significantly = poor resilience
  - Low fatigue = consistent = good stamina

---

## After the Screener Completes

When all 5 steps pass, the system assigns:

### **Path 1 (Intent Capture)** if:
- S2 hold stability is weak (many re-entries, slow to enter)
- S3 activation has very high false positives (mouth can't be controlled reliably)
- S4 corridor adherence is poor (<40% inside)
- **LIP Tier**: 1 or 2 (depends on S1/S2/S3 profile)

### **Path 2 (Guided Control)** if:
- S2 holds for 5 sec with <3 re-entries
- S3 activation is reliable (low false-positive rate)
- S4 adherence is ≥60% inside corridor
- Fatigue index is acceptable (<0.4 degradation)
- **LIP Tier**: 3 or 4 (depends on S2/S4 quality)

### **Fails** / Extra Support if:
- Step 2 fails 3 times (can't hold for 5 sec)
- Step 4 fails (poor corridor control)
- → User assigned to **Path 1 with additional scaffolding** (wider corridors, longer dwell times, caregiver assist recommended)

---

## Tips for a Successful Screener Demo

1. **Stay calm and encouraging**: "You're doing great, keep going!"
2. **Speak clearly**: Audio instructions play; minimize background noise
3. **Let them learn**: S1–2 are teaching moments; child learns head→cursor + hold
4. **Be patient on S2**: Some children take 2–3 attempts to understand the 5-sec hold
5. **Watch for fatigue**: If child seems tired after S4, S5 will show it
6. **Dwell fallback hint**: If activation is unreliable, tell caregivers: "The app can use 'hold still' instead of mouth-open if needed"

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cursor won't move | Check webcam is on; ensure good lighting; face fully in frame |
| Cursor stuck | Recenter cursor (button usually top-right); child tilts head to test movement |
| Audio not playing | Unmute browser; check volume; try speaker or headphones |
| Step seems stuck | App may be waiting for instruction to finish (audio plays first) |
| Child loses focus | Take a break; restart screener later (progress is saved) |

---

## Understanding the Result

**After the screener, the caregiver dashboard shows:**
- ✅ Path assigned (Path 1 or Path 2)
- ✅ LIP Tier (1, 2, 3, or 4)
- ✅ Recommended assistance (dwell fallback? wider corridors?)
- ✅ Next steps: "Start with lessons on [Path]"

The child can now begin lessons tailored to their profile!

---

## For Demos / Presentations

**Time**: ~3–5 minutes per child  
**Best shown**: Live or video recording (screener is interactive; pre-recorded video won't capture that)  
**Highlight**: "The app learns the child's abilities in real-time and adjusts difficulty — no manual settings needed"
