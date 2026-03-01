import { NavLink, Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X, User, Settings, LogOut, Pencil, BookOpen, Image, Code2 } from "lucide-react";
import { useAppState } from "../context/AppStateContext";

const PATH_TO_LABEL = {
  "/home": "Home",
  "/canvas": "Draw",
  "/lessons": "Lessons",
  "/gallery": "Gallery",
  "/calibration": "Calibration",
  "/settings": "Settings",
  "/profile": "Profile",
  "/eligibility": "Eligibility",
  "/screener": "Screener",
};

function getPageLabel(pathname) {
  if (PATH_TO_LABEL[pathname]) return PATH_TO_LABEL[pathname];
  if (pathname.startsWith("/lesson/")) return "Lesson";
  return pathname === "/" ? "Home" : pathname.slice(1) || "Home";
}

const DEV_LINKS = [
  { name: "Home", path: "/home" },
  { name: "Calibration", path: "/calibration" },
  { name: "Eligibility", path: "/eligibility" },
  { name: "Screener", path: "/screener" },
  { name: "Lessons", path: "/lessons" },
  { name: "Canvas", path: "/canvas" },
  { name: "Gallery", path: "/gallery" },
  { name: "Settings", path: "/settings" },
  { name: "Profile", path: "/profile" },
];

function getModeLabel(effectiveLipMode) {
  if (effectiveLipMode === 1) return "Intent Capture";
  if (effectiveLipMode === 2) return "Guided Control";
  return "Not set";
}

const isDev = import.meta.env.DEV;

export default function Navbar({ isAuthenticated, user, onSignOut }) {
  const location = useLocation();
  const { profile, effectiveLipMode, modeOverride, setModeOverride } = useAppState();
  const pageLabel = getPageLabel(location.pathname);
  const modeLabel = getModeLabel(effectiveLipMode);
  const currentStage = profile?.currentStage ?? 0;
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const profileRef = useRef(null);
  const devMenuRef = useRef(null);

  const navLinks = [
    { name: "Home", path: "/home", icon: null },
    { name: "Draw", path: "/canvas", icon: Pencil },
    { name: "Lessons", path: "/lessons", icon: BookOpen },
    { name: "Gallery", path: "/gallery", icon: Image },
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (devMenuRef.current && !devMenuRef.current.contains(e.target)) setDevMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-indigo-100/50 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        {/* Logo */}
        <Link
          to={isAuthenticated ? "/home" : "/"}
          className="flex items-center min-h-12 min-w-[4rem] justify-center"
        >
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent transition-all duration-300 hover:opacity-90">
            EaseL
          </span>
        </Link>

        {/* Desktop nav links - only when authenticated */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 min-h-12 px-5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700"
                        : "text-slate-600 hover:bg-white/60 hover:text-slate-800"
                    }`
                  }
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {link.name}
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Right: Profile or Login */}
        <div className="flex items-center min-h-12">
          {isAuthenticated ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-700 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Profile menu"
              >
                <User className="w-6 h-6" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 transition-colors"
                  >
                    <User className="w-5 h-5 text-indigo-500" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-indigo-500" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onSignOut();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="min-h-12 px-6 flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:opacity-95 transition-all duration-300"
            >
              Login
            </Link>
          )}

          {/* Mobile menu toggle - when authenticated */}
          {isAuthenticated && (
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden ml-2 flex items-center justify-center w-12 h-12 rounded-2xl text-slate-600 hover:bg-white/60"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Status row: page, mode, stage, and dev override (when authenticated) */}
      {isAuthenticated && (
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex flex-wrap items-center gap-3 text-sm border-t border-indigo-100/50 bg-slate-50/60">
          <span className="font-medium text-slate-700">{pageLabel}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600">Mode: {modeLabel}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600">Stage {currentStage}</span>
          {isDev && (
            <>
              <span className="text-slate-400 ml-1">·</span>
              <label className="flex items-center gap-2 text-slate-600">
                <span>Test:</span>
                <select
                  value={modeOverride === null ? "profile" : String(modeOverride)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setModeOverride(v === "profile" ? null : Number(v));
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                >
                  <option value="profile">Use stored profile</option>
                  <option value="1">Simulate Mode 1 (Intent Capture)</option>
                  <option value="2">Simulate Mode 2 (Guided Control)</option>
                </select>
              </label>
              <span className="text-slate-400">·</span>
              <div className="relative" ref={devMenuRef}>
                <button
                  type="button"
                  onClick={() => setDevMenuOpen(!devMenuOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Dev</span>
                </button>
                {devMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 py-2 min-w-[10rem] bg-white rounded-xl shadow-lg border border-slate-200 z-50">
                    {DEV_LINKS.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setDevMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Mobile menu */}
      {isAuthenticated && (
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-t border-indigo-100/50 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 min-h-12 px-4 rounded-2xl text-base font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  {link.name}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
