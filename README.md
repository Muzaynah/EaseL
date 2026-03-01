# EaseL

EaseL is a browser-based web application for assistive drawing and learning, designed for **children with cerebral palsy (CP)** who have upper-limb motor impairments. The system enables hands-free interaction using head movements and facial gestures, allowing users to draw, practice guided lessons, and engage in creative activities without traditional input devices.

EaseL runs entirely on the client side as a web app to ensure privacy, accessibility, and ease of deployment.

## Motivation

Most digital art and learning tools rely on fine motor control through a mouse, keyboard, or touch input. Children with cerebral palsy (CP) and other neuromotor disabilities often face significant barriers when accessing such systems.

EaseL addresses this gap by providing an inclusive, hands-free web application that enables creative expression and guided learning using only a webcam and facial movement. The project focuses on accessibility for children with CP, privacy, and low-cost deployment.

## Key Features

- Head-movement-based cursor control using facial landmarks
- Gesture-based drawing activation such as blinking or mouth opening
- Two interaction modes:
  - Precise Mode for accurate cursor mapping
  - Directional Mode for velocity-based movement
- Real-time stroke smoothing and predictive assistance
- Adjustable brush size, color, and opacity
- Guided drawing and learning lessons in English and Urdu
- Local project saving and export in PNG format
- Fully client-side processing with no backend dependency

## Technologies Used

- Frontend Framework: React
- Styling: Tailwind CSS
- Creative Coding: p5.js
- Face Tracking: MediaPipe FaceMesh
- Storage: IndexedDB and LocalStorage; **Firebase** (Auth + Firestore) for accounts and profiles
- APIs: WebRTC getUserMedia and Web Speech API
- Build Tools: Vite

## Getting Started

### Accounts and Firebase (optional)
Profile and account data are stored in Firebase when configured. Copy `.env.example` to `.env` and add your Firebase project keys (create a project at [Firebase Console](https://console.firebase.google.com), enable **Authentication** and **Firestore**). Without `.env`, the app runs in demo mode (one account stored in the browser).

### Prerequisites
- Modern web browser such as Chrome, Firefox, or Edge
- Webcam with at least 720p resolution
- Stable lighting environment

### Running the Application

1. **Development:** Run `npm run dev` and open the URL shown in the terminal (e.g. `http://localhost:5173`) in your browser.
2. **Production build:** Run `npm run build`, then `npm run preview` to test the built app. Deploy the `dist` folder to any static host.

## Usage Overview

1. Allow camera access when prompted
2. Complete the calibration process
3. Select a drawing mode
4. Use head movements to control the cursor
5. Perform gestures to start or stop drawing
6. Save or export artwork locally
7. Explore guided learning modules

## Accessibility Considerations

- Large and clearly labeled interface elements
- High-contrast visuals for improved visibility
- Minimal text with optional audio guidance
- No requirement for hand or finger input
- Designed following WCAG 2.1 accessibility principles

## Privacy and Security

- All video processing occurs locally in the browser
- No camera data or personal information is transmitted
- No user accounts or cloud storage required
- Diagnostics and logging are optional and local-only

## License

This project is licensed under the MIT License.

## Acknowledgments

Developed as a Final Year Project under the Department of Computing,  
School of Electrical Engineering and Computer Science,  
National University of Sciences and Technology (NUST).