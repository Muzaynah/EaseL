import { NavLink, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X, User, Settings, LogOut, BookOpen, Image as ImageIcon, BarChart3 } from "lucide-react";

/**
 * Path-aware navbar per framework §8.2:
 *   Setup routes (calibration/tutorial/screener): minimal — logo only.
 *   Path 1 (Intent Assist): no navigation links, caregiver controls hidden behind avatar.
 *   Path 2 (Guided Control): full nav (Home / Lessons / Gallery).
 */
export default function Navbar({ isAuthenticated, user, profile, inSetup, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const pathId = profile?.pathId ?? profile?.lipMode ?? null;
  const isMode1 = pathId === 1;
  const isMode2 = pathId === 2;

  const navLinks = isMode2
    ? [
        { name: "Home", path: "/home", icon: null },
        { name: "Lessons", path: "/lessons", icon: BookOpen },
        { name: "Gallery", path: "/gallery", icon: ImageIcon },
      ]
    : [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showNavLinks = isAuthenticated && !inSetup && isMode2;
  const showCaregiverMenu = isAuthenticated && !inSetup;

  return (
    <nav className="easeL-nav fixed top-0 left-0 z-50 w-full shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <Link
          to={isAuthenticated ? "/home" : "/"}
          className="flex items-center min-h-12 min-w-[4rem] justify-center"
        >
          <span className="easeL-logo text-2xl font-extrabold tracking-tight transition-opacity duration-300 hover:opacity-90">
            EaseL
          </span>
        </Link>

        {showNavLinks && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `easeL-nav-pill flex items-center gap-2 min-h-12 px-5 text-base font-semibold ${
                      isActive ? "is-active" : ""
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

        <div className="flex items-center min-h-12 gap-2">
          {isAuthenticated ? (
            showCaregiverMenu ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="easeL-avatar-btn flex items-center justify-center min-h-12 min-w-12 rounded-2xl font-semibold text-lg transition-all duration-300"
                  aria-label={isMode1 ? "Caregiver menu" : "Profile menu"}
                  title={isMode1 ? "Caregiver menu" : "Profile menu"}
                >
                  {user?.name || user?.email ? (
                    <span className="uppercase">
                      {(user.name || user.email || "U").charAt(0)}
                    </span>
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </button>
                {profileOpen && (
                  <div className="easeL-dropdown absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border-2 bg-white/95 py-2 shadow-2xl backdrop-blur-md">
                    {isMode1 && (
                      <div
                        className="border-b px-4 py-2"
                        style={{ borderColor: "var(--easeL-border-subtle)" }}
                      >
                        <p
                          className="text-sm font-semibold uppercase tracking-wide"
                          style={{ color: "var(--easeL-text-muted)" }}
                        >
                          Caregiver only
                        </p>
                      </div>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-12 items-center gap-3 px-4 py-3 text-base transition-colors"
                      style={{ color: "var(--easeL-text)" }}
                    >
                      <User
                        className="h-5 w-5 shrink-0"
                        style={{ color: "var(--easeL-primary)" }}
                      />
                      Profile
                    </Link>
                    <Link
                      to="/progress"
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-12 items-center gap-3 px-4 py-3 text-base transition-colors"
                      style={{ color: "var(--easeL-text)" }}
                    >
                      <BarChart3
                        className="h-5 w-5 shrink-0"
                        style={{ color: "var(--easeL-primary)" }}
                      />
                      Progress
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-12 items-center gap-3 px-4 py-3 text-base transition-colors"
                      style={{ color: "var(--easeL-text)" }}
                    >
                      <Settings
                        className="h-5 w-5 shrink-0"
                        style={{ color: "var(--easeL-primary)" }}
                      />
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
            ) : null
          ) : (
            <>
              <Link
                to="/signup"
                className="min-h-12 px-4 flex items-center justify-center rounded-2xl border-2 font-semibold transition-all duration-300 hover:opacity-95"
                style={{
                  borderColor: "var(--easeL-primary)",
                  color: "var(--easeL-link)",
                }}
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="min-h-12 px-5 flex items-center justify-center rounded-2xl text-white font-semibold shadow-lg transition-all duration-300 hover:opacity-95"
                style={{ background: "var(--easeL-primary)" }}
              >
                Sign in
              </Link>
            </>
          )}

          {showNavLinks && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="md:ml-2 flex min-h-12 min-w-12 items-center justify-center rounded-2xl md:hidden"
              style={{ color: "var(--easeL-text-muted)" }}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {showNavLinks && (
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div
            className="space-y-1 border-t bg-white/95 px-6 py-4 backdrop-blur-md"
            style={{ borderColor: "var(--easeL-nav-border)" }}
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `easeL-nav-pill flex min-h-12 items-center gap-3 rounded-2xl px-4 text-base font-semibold ${
                      isActive ? "is-active" : ""
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
