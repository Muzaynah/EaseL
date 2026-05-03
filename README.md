# EaseL

EaseL is a browser-based assistive platform that helps children with motor impairments draw and learn hands-free using head movement and facial gestures.

It is built for accessibility first: low-friction setup, webcam-only interaction, guided practice, and caregiver-friendly progress tracking.

## What EaseL Provides

- Hands-free cursor control using MediaPipe FaceMesh
- Gesture-based activation (mouth-open / dwell style controls)
- Structured onboarding flow: eligibility, calibration, tutorial, and path assignment screener
- Guided lessons with Path -> Level -> Lesson -> Step progression and reinforcement feedback
- Creative canvas mode with local save/export
- Caregiver progress dashboard and metric export
- English/Urdu support

## High-Level Flow

1. Sign up or log in (or demo mode without Firebase config)
2. Complete setup sequence:
   - Eligibility
   - Calibration
   - Tutorial
   - Path Assignment Screener
3. Enter core app:
   - Home
   - Canvas
   - Lessons (Path 1 / Path 2)
   - Gallery
   - Caregiver pages (Profile, Settings, Progress)

## Tech Stack

- React + Vite
- Tailwind CSS
- MediaPipe FaceMesh + camera_utils
- Firebase Auth + Firestore (optional; app supports demo/local mode)
- LocalStorage/IndexedDB-backed persistence utilities

## Quick Start

### 1) Install

```bash
npm install
```

### 2) Optional Firebase setup

If you want real accounts + cloud profile storage:

- Copy `.env.example` to `.env`
- Add Firebase project config values
- Enable Firebase Authentication and Firestore

Without `.env`, EaseL runs in local demo mode.

### 3) Run

```bash
npm run dev
```

Open the local URL shown in terminal (usually `http://localhost:5173`).

### 4) Build + preview

```bash
npm run build
npm run preview
```

## Project Structure (important folders)

- `src/pages` - route-level pages (Landing, Home, Calibration, Screener, etc.)
- `src/assets` - static images and media (imported; bundled by Vite)
- `src/pages/lessons` - lesson routes (`LessonPath1`, `LessonPath2`) and `path2/` path-mode helpers
- `src/components` - reusable UI blocks
- `src/hooks` - behavior hooks (face mesh, gesture control, timers, reinforcement)
- `src/utils` - pure logic and data helpers (paths, levels, lesson flow, persistence, adaptation)
- `src/context` - global app/auth state providers
- `src/firebase` - Firebase config and profile helpers
- `src/theme` - shared palette and theme assets

## Accessibility and Privacy

- No mouse/keyboard requirement during core interaction
- Large UI elements and high-contrast visual design cues
- Optional spoken guidance for key tasks
- Video is processed client-side; no raw camera stream is uploaded by default app flow

## License

MIT

## Acknowledgment

Developed as a Final Year Project at NUST (SEECS), Department of Computing.