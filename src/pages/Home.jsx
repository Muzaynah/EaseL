import { Link } from "react-router-dom";
import { Pencil, BookOpen, Image, Settings } from "lucide-react";

export default function Home({ user }) {
  const displayName = user?.name ?? "User";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const quickActions = [
    {
      icon: Pencil,
      title: "Free Draw",
      description: "Create anything you imagine",
      buttonText: "Start Drawing",
      path: "/canvas",
    },
    {
      icon: BookOpen,
      title: "Guided Lessons",
      description: "Learn with step-by-step guides",
      buttonText: "Browse Lessons",
      path: "/lessons",
    },
    {
      icon: Image,
      title: "My Gallery",
      description: "View your creations",
      buttonText: "View Gallery",
      path: "/gallery",
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Customize experience",
      buttonText: "Open Settings",
      path: "/settings",
    },
  ];

  const stats = [
    { label: "Lessons Completed", value: "3 / 12" },
    { label: "Drawings Created", value: "15" },
    { label: "Practice Time", value: "5.2 hrs" },
  ];

  const recentActivity = [
    { type: "Completed", title: "Draw a Circle", time: "2 hours ago" },
    { type: "Created", title: "Sunset Drawing", time: "1 day ago" },
    { type: "Completed", title: "Draw a Line", time: "2 days ago" },
    { type: "Created", title: "Mountain Scene", time: "3 days ago" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <section className="bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/50">
          <h1 className="text-3xl font-bold text-slate-800">
            Welcome back, {displayName}!
          </h1>
          <p className="text-slate-600 mt-1">
            {dateStr} · {timeStr}
          </p>
        </section>

        {/* Quick Actions Grid */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.title}
                  className="bg-white/90 backdrop-blur-md rounded-3xl p-6 min-h-[200px] flex flex-col shadow-2xl border border-white/50 hover:border-indigo-200 hover:shadow-indigo-100/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {action.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 flex-1">{action.description}</p>
                  <Link
                    to={action.path}
                    className="mt-4 inline-flex items-center justify-center min-h-12 px-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:opacity-95 transition-all duration-300 w-full sm:w-auto"
                  >
                    {action.buttonText}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Statistics */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Statistics</h2>
          <div className="flex flex-wrap gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/90 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border border-white/50 min-w-[180px]"
              >
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/50">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            Recent Activity
          </h2>
          <ul className="space-y-3">
            {recentActivity.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
              >
                <span className="text-slate-700">
                  <span className="font-medium text-slate-500">{item.type}:</span>{" "}
                  {item.title}
                </span>
                <span className="text-sm text-slate-500">{item.time}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
