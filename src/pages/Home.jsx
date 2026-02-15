import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h2 className="text-5xl font-extrabold text-slate-800 mb-6">
          Hands-Free Drawing with Facial Gestures
        </h2>
        <p className="text-lg text-slate-600 mb-10 leading-relaxed">
          A tremor-tolerant drawing application powered by MediaPipe FaceMesh.
          Control the cursor using head movement and toggle drawing using mouth gestures.
        </p>

        <Link
          to="/canvas"
          className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:scale-105 transition"
        >
          Start Drawing
        </Link>
      </div>
    </div>
  );
}
