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
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Main content: hero + features in one viewport (below navbar) */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 pt-36 pb-6">
        {/* Hero block - centered with more space from top */}
        <div className="text-center mb-6 md:mb-8 flex-shrink-0">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-800 mb-2">
            Let's get drawing
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-xl mx-auto">
            Create and learn with EaseL — designed for users with motor impairments.
          </p>
        </div>

        {/* Features grid - 4 equal boxes */}
        <div className="w-full max-w-4xl flex-1 min-h-0 grid grid-cols-2 gap-3 md:gap-4 content-center">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white/90 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-lg border border-white/60 hover:border-indigo-200 hover:shadow-xl transition-all flex flex-col items-center justify-center text-center min-h-0"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-2 md:mb-3 flex-shrink-0">
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-800 mb-0.5 md:mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs md:text-sm text-slate-600 leading-snug">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Subtle prompt to use navbar */}
        <p className="text-slate-500 text-sm mt-2 flex-shrink-0">
          Get started or sign in using the menu above
        </p>
      </div>
    </div>
  );
}
