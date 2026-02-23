import { Link } from "react-router-dom";
import { Move, Smile, BookOpen, Cloud } from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Move,
      title: "Hands-Free Control",
      description: "Control your cursor using natural head movements",
    },
    {
      icon: Smile,
      title: "Gesture Recognition",
      description: "Draw and interact using simple facial expressions",
    },
    {
      icon: BookOpen,
      title: "Step-by-Step Lessons",
      description: "Learn drawing with adaptive, guided lessons",
    },
    {
      icon: Cloud,
      title: "Save Your Progress",
      description: "Access your work from any device",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Hero */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center px-6 text-center pt-16 pb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          EaseL
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-slate-700 max-w-2xl mb-2">
          An Assistive Drawing & Guided Learning Platform
        </p>
        <p className="text-lg text-slate-600 max-w-xl mb-10">
          For Users with Motor Impairments.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/signup"
            className="min-h-14 px-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-2xl hover:shadow-indigo-200/50 hover:opacity-95 transition-all flex items-center justify-center"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="min-h-14 px-10 rounded-2xl border-2 border-indigo-500 text-indigo-600 font-semibold text-lg hover:bg-indigo-50 transition-all flex items-center justify-center"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="min-h-[100vh] px-12 pb-12 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold pt-24 text-slate-800 text-center mb-12">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50 hover:border-indigo-100 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
