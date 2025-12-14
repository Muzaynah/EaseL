import { FaceMesh } from "@mediapipe/face_mesh";

export default class FaceTrackerEngine {
  constructor({ videoElement, onResults, options = {} }) {
    this.videoElement = videoElement;
    this.onResults = onResults;

    // explicit versioned path to avoid asset loader mismatches
    this.faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633556675/${file}`
    });

    this.faceMesh.setOptions({
      maxNumFaces: options.maxNumFaces || 1,
      refineLandmarks: options.refineLandmarks ?? true,
      minDetectionConfidence: options.minDetectionConfidence ?? 0.5,
      minTrackingConfidence: options.minTrackingConfidence ?? 0.5
    });

    this.faceMesh.onResults(this._handleResults.bind(this));
    this._running = false;
    this._raf = null;
  }

  _handleResults(results) {
    try {
      this.onResults && this.onResults(results);
    } catch (e) {
      // swallow callback errors to keep loop alive
      console.warn("FaceTrackerEngine onResults error", e);
    }
  }

  async start() {
    if (this._running) return;
    this._running = true;

    const tick = async () => {
      if (!this._running) return;
      try {
        // ensure video element exists and has data
        if (this.videoElement && this.videoElement.readyState >= 2) {
          await this.faceMesh.send({ image: this.videoElement });
        }
      } catch (e) {
        // ignore transient errors from wasm loader or frame send
        // console.warn("faceMesh.send error", e);
      }
      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this._running = false;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }
}
