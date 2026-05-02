import { NavLink, Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Menu, X, User, Settings, LogOut, House, BookOpen, Image as ImageIcon, BarChart3 } from "lucide-react";

/**
 * Path-aware navbar per framework §8.2:
 *   Setup routes (calibration/tutorial/screener): minimal — logo only.
 *   Path 1 (Intent Assist): no navigation links, caregiver controls hidden behind avatar.
 *   Path 2 (Guided Control): full nav (Home / Lessons / Gallery).
 */
export default function Navbar({ isAuthenticated, user, profile, inSetup, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeRailStyle, setActiveRailStyle] = useState(null);
  const profileRef = useRef(null);
  const linksWrapRef = useRef(null);
  const location = useLocation();

  const pathId = profile?.pathId ?? profile?.lipMode ?? null;
  const isMode1 = pathId === 1;
  const isMode2 = pathId === 2;

  const navLinks = isMode2
    ? [
        { name: "Home", path: "/home", icon: House },
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
  const preferredName =
    profile?.fullName ||
    profile?.displayName ||
    profile?.name ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    "";
  const profileLabel = (preferredName.includes("@") ? "Profile" : preferredName || "Profile").trim();

  useLayoutEffect(() => {
    if (!showNavLinks) return undefined;
    const updateRail = () => {
      const wrap = linksWrapRef.current;
      const active = wrap?.querySelector(".easeL-nav-pill.is-active");
      if (!wrap || !active) {
        setActiveRailStyle(null);
        return;
      }
      setActiveRailStyle({
        left: active.offsetLeft,
        width: active.offsetWidth,
      });
    };
    updateRail();
    window.addEventListener("resize", updateRail);
    return () => window.removeEventListener("resize", updateRail);
  }, [showNavLinks, location.pathname]);

  return (
    <nav className="easeL-nav fixed inset-x-0 z-50 px-3 sm:px-5">
      <div className="mx-auto flex h-17 max-w-6xl items-center justify-between gap-2 sm:gap-3">
        <Link
          to="/"
          className="easeL-brand easeL-brand--mark flex min-h-12 items-center px-1"
        >
          <span className="easeL-logo text-[2.9rem] leading-none">
            Ease<span className="easeL-brand-accent">L</span>
          </span>
        </Link>

        {showNavLinks && (
          <div ref={linksWrapRef} className="easeL-nav-links-wrap hidden items-center gap-1 md:flex">
            <span
              className="easeL-nav-active-glide"
              style={{
                opacity: activeRailStyle ? 1 : 0,
                width: activeRailStyle ? `${activeRailStyle.width}px` : 0,
                transform: activeRailStyle ? `translateX(${activeRailStyle.left}px)` : "translateX(0)",
              }}
              aria-hidden
            />
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `easeL-nav-pill flex min-h-12 items-center gap-2 px-5 text-base font-semibold ${
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

        <div className="flex min-h-12 shrink-0 items-center gap-2">
          {isAuthenticated ? (
            showCaregiverMenu ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="easeL-avatar-btn easeL-profile-chip flex min-h-11 items-center gap-2 rounded-full px-2.5 pr-3"
                  aria-label={isMode1 ? "Caregiver menu" : "Profile menu"}
                  title={isMode1 ? "Caregiver menu" : "Profile menu"}
                >
                  {user?.name || user?.email ? (
                    <span className="easeL-profile-avatar">{(user.name || user.email || "U").charAt(0).toUpperCase()}</span>
                  ) : (
                    <span className="easeL-profile-avatar">
                      <User className="w-4 h-4" />
                    </span>
                  )}
                  <span className="easeL-profile-label hidden sm:inline">{profileLabel}</span>
                </button>
                {profileOpen && (
                  <div className="easeL-dropdown absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border-2 bg-white py-2 shadow-2xl">
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
                      className="easeL-transition-fast flex min-h-12 items-center gap-3 px-4 py-3 text-base"
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
                      className="easeL-transition-fast flex min-h-12 items-center gap-3 px-4 py-3 text-base"
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
                      className="easeL-transition-fast flex min-h-12 items-center gap-3 px-4 py-3 text-base"
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
                      className="easeL-transition-fast flex w-full items-center gap-3 px-4 py-3 text-left"
                      style={{ color: "var(--easeL-accent-coral)" }}
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
                className="easeL-interactive min-h-11 px-4 flex items-center justify-center rounded-xl border-2 font-semibold hover:opacity-95"
                style={{
                  borderColor: "var(--easeL-primary)",
                  color: "var(--easeL-link)",
                }}
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="easeL-interactive min-h-11 px-5 flex items-center justify-center rounded-xl text-white font-semibold shadow-lg hover:opacity-95"
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
              className="md:ml-1 flex min-h-11 min-w-11 items-center justify-center rounded-xl md:hidden"
              style={{ color: "var(--easeL-text-muted)" }}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {showNavLinks && (
        <div className="mx-auto max-w-6xl">
          <div
            className={`easeL-nav-mobile-panel md:hidden overflow-hidden rounded-2xl bg-white/95 easeL-transition-standard ${
              open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `easeL-nav-pill flex min-h-11 items-center gap-3 rounded-2xl px-4 text-base font-semibold ${
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
        </div>
      )}
    </nav>
  );
}
