# EaseL

EaseL is a browser-based assistive drawing and learning application designed for individuals with upper-limb motor impairments. The system enables hands-free interaction using head movements and facial gestures, allowing users to draw, practice guided lessons, and engage in creative activities without traditional input devices.

EaseL is implemented as a Progressive Web Application (PWA) and runs entirely on the client side to ensure privacy, accessibility, and ease of deployment.

---

## Motivation

Most digital art and learning tools rely on fine motor control through a mouse, keyboard, or touch input. Individuals with neuromotor disabilities often face significant barriers when accessing such systems.

EaseL addresses this gap by providing an inclusive, hands-free platform that enables creative expression and guided learning using only a webcam and facial movement. The project focuses on accessibility, privacy, and low-cost deployment.

---

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
- Progressive Web App support with offline functionality
- Fully client-side processing with no backend dependency

---

## System Architecture Overview

EaseL follows a layered client-side architecture:

- Presentation Layer: User interface and accessibility components
- Interaction Layer: Gesture detection and mode control
- Processing Layer: Face tracking, smoothing, and drawing logic
- Data Layer: Local persistence using browser storage
- External Libraries: MediaPipe FaceMesh, p5.js, and Web APIs

The system does not require a backend server for core functionality.

---

## Technologies Used

- Frontend Framework: React
- Styling: Tailwind CSS
- Creative Coding: p5.js
- Face Tracking: MediaPipe FaceMesh
- Storage: IndexedDB and LocalStorage
- APIs: WebRTC getUserMedia and Web Speech API
- Build Tools: Vite

---

## Getting Started

### Prerequisites
- Modern web browser such as Chrome, Firefox, or Edge
- Webcam with at least 720p resolution
- Stable lighting environment

### Installation

1. Clone the repository:
   git clone https://github.com/your-username/EaseL.git

2. Navigate to the project directory:
   cd EaseL

3. Install dependencies:
   npm install

4. Start the development server:
   npm run dev

5. Open the provided local URL in your browser.

---

## Usage Overview

1. Allow camera access when prompted
2. Complete the calibration process
3. Select a drawing mode
4. Use head movements to control the cursor
5. Perform gestures to start or stop drawing
6. Save or export artwork locally
7. Explore guided learning modules

---

## Accessibility Considerations

- Large and clearly labeled interface elements
- High-contrast visuals for improved visibility
- Minimal text with optional audio guidance
- No requirement for hand or finger input
- Designed following WCAG 2.1 accessibility principles

---

## Privacy and Security

- All video processing occurs locally in the browser
- No camera data or personal information is transmitted
- No user accounts or cloud storage required
- Diagnostics and logging are optional and local-only

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

Developed as a Final Year Project under the Department of Computing,  
School of Electrical Engineering and Computer Science,  
National University of Sciences and Technology (NUST).