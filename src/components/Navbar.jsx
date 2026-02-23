import { NavLink, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X, User, Settings, LogOut, Pencil, BookOpen, Image } from "lucide-react";

export default function Navbar({ isAuthenticated, user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const navLinks = [
    { name: "Home", path: "/home", icon: null },
    { name: "Draw", path: "/canvas", icon: Pencil },
    { name: "Lessons", path: "/lessons", icon: BookOpen },
    { name: "Gallery", path: "/gallery", icon: Image },
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 w-full min-h-[4rem] h-16 bg-white/80 backdrop-blur-md border-b border-indigo-100/50 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
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
