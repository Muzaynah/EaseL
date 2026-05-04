import { NavLink, Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Menu, X, User, Settings, LogOut, House, BookOpen, Image as ImageIcon, BarChart3, Brush } from "lucide-react";
import { useCursorPositionBridgeRef } from "../context/CursorPositionBridgeContext";

// Total visual height of navbar bar + wave shape below it
const NAV_BAR_H = 92;   // px — the actual nav pill row height
const WAVE_H    = 28;   // px — the wave SVG below the bar
const NAV_TOTAL = NAV_BAR_H + WAVE_H + 16; // what pages offset by

const HIDE_AFTER_MS  = 4000; // ms of inactivity before sliding up
const REVEAL_ZONE_PX = 72;   // head cursor y ≤ this → show navbar

// Writes --nav-offset onto <html> so pages can animate their padding-top via CSS
function setNavOffset(px) {
  document.documentElement.style.setProperty("--nav-offset", `${px}px`);
}

// Pastel rose — visible but not aggressive
const ACTIVE_PILL_BG    = "#ffdbe2"; // soft blush
const ACTIVE_PILL_TEXT  = "#8b1a2e"; // deep rose, readable

export default function Navbar({
  isAuthenticated, user, profile, inSetup,
  onSignOut, onOpenSettings, language, onLanguageChange,
}) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const profileRef   = useRef(null);
  const hideTimerRef = useRef(null);
  const location     = useLocation();
  const isLanding    = location.pathname === "/";

  // Head-cursor bridge (may not be available on all routes)
  let cursorPosRef = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cursorPosRef = useCursorPositionBridgeRef();
  } catch { /* not in context */ }

  // ------------------------------------------------------------------
  // Auto-hide / reveal logic
  // ------------------------------------------------------------------
  const reveal = useCallback(() => {
    setHidden(false);
    clearTimeout(hideTimerRef.current);
    if (!isLanding) {
      hideTimerRef.current = setTimeout(() => setHidden(true), HIDE_AFTER_MS);
    }
  }, [isLanding]);

  // Mouse movement
  useEffect(() => {
    window.addEventListener("mousemove", reveal);
    reveal(); // start the timer on mount
    return () => {
      window.removeEventListener("mousemove", reveal);
      clearTimeout(hideTimerRef.current);
    };
  }, [reveal]);

  // Head cursor proximity — bridge stores position in .raw.y
  useEffect(() => {
    if (!cursorPosRef) return;
    let raf;
    const check = () => {
      const y = cursorPosRef.current?.raw?.y ?? cursorPosRef.current?.y ?? Infinity;
      if (y <= REVEAL_ZONE_PX) reveal();
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [cursorPosRef, reveal]);

  // Never hide on landing page
  useEffect(() => {
    if (isLanding) {
      setHidden(false);
      clearTimeout(hideTimerRef.current);
    }
  }, [isLanding]);

  // Sync CSS variable so pages shift with the navbar
  useEffect(() => {
    setNavOffset(hidden ? 44 : NAV_TOTAL);
  }, [hidden]);
  // Initialise on mount
  useEffect(() => { setNavOffset(NAV_TOTAL); }, []);

  // ------------------------------------------------------------------
  // Profile / mode
  // ------------------------------------------------------------------
  const pathId   = profile?.pathId ?? profile?.lipMode ?? null;
  const isMode2  = pathId === 2;

  const lang = profile?.caregiverReported?.language ?? language ?? "en";
  const navLinks = isMode2
    ? [
        { name: lang === "ur" ? "ہوم"       : "Home",         path: "/home",    icon: House },
        { name: lang === "ur" ? "سبق"       : "Lessons",      path: "/lessons", icon: BookOpen },
        { name: lang === "ur" ? "گیلری"     : "Gallery",      path: "/gallery", icon: ImageIcon },
        { name: lang === "ur" ? "آزاد ڈرائنگ" : "Free Drawing", path: "/canvas",  icon: Brush },
      ]
    : [];

  useEffect(() => {
    const close = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const showNavLinks     = isAuthenticated && !inSetup && isMode2;
  const showCaregiverMenu = isAuthenticated && !inSetup;

  const preferredName =
    profile?.fullName ||
    profile?.displayName ||
    profile?.name ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user?.name || "";
  const profileLabel = (preferredName.includes("@") ? "Profile" : preferredName || "Profile").trim();

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const translateY = hidden ? `-${NAV_TOTAL + 8}px` : "0px";

  return (
    <div
      className="fixed inset-x-0 z-50 transition-transform duration-500 ease-in-out"
      style={{ top: 0, transform: `translateY(${translateY})` }}
    >
      {/* ── Solid nav bar ── */}
      <nav
        className="easeL-nav w-full px-3 sm:px-5"
        style={{ position: "static", background: "#bfb2dd", boxShadow: "0 8px 16px -4px rgba(0,0,0,0.22)" }}
      >
        <div className="mx-auto flex items-center justify-between gap-2 sm:gap-3"
          style={{ height: `${NAV_BAR_H}px`, maxWidth: "1152px" }}>

          <Link to="/" className="easeL-brand easeL-brand--mark flex items-center px-1">
            <span className="easeL-logo text-[2.9rem] leading-none">
              Ease<span className="easeL-brand-accent">L</span>
            </span>
          </Link>

          {showNavLinks && (
            <div className="hidden items-center gap-0.5 md:flex">
              {navLinks.map(({ name, path, icon: Icon }) => (
                <NavLink
                  key={name}
                  to={path}
                  className={({ isActive }) =>
                    isActive
                      ? "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                      : "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold hover:bg-white/60 transition-colors"
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: ACTIVE_PILL_BG, color: ACTIVE_PILL_TEXT }
                      : { color: "#1a1a2e" }
                  }
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {name}
                </NavLink>
              ))}
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {isAuthenticated ? (
              showCaregiverMenu ? (
                <>
                  {/* EN / UR toggle */}
                  {onLanguageChange && (
                    <div className="hidden sm:flex items-center rounded-xl border border-white/60 bg-white/50 overflow-hidden">
                      {["en", "ur"].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => onLanguageChange(lang)}
                          className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                            language === lang
                              ? "bg-[var(--easeL-primary)] text-white"
                              : "hover:bg-white/70"
                          }`}
                          style={language !== lang ? { color: "#1a1a2e" } : undefined}
                        >
                          {lang === "en" ? "EN" : "اردو"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Settings */}
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/50 hover:bg-white/80 transition-colors"
                      style={{ color: "#1a1a2e" }}
                      aria-label="Open settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}

                  {/* Profile chip */}
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/50 hover:bg-white/80 transition-colors px-3 py-1.5 min-h-9"
                      aria-label="Profile menu"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white shrink-0" style={{ background: "#1a1a2e" }}>
                        {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                      </span>
                      <span className="hidden sm:inline text-xs font-bold" style={{ color: "#1a1a2e" }}>{profileLabel}</span>
                    </button>
                    {profileOpen && (
                      <div className="easeL-dropdown absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border-2 bg-white py-2 shadow-2xl">
                        <Link to="/profile" onClick={() => setProfileOpen(false)}
                          className="easeL-transition-fast flex min-h-12 items-center gap-3 px-4 py-3 text-base"
                          style={{ color: "var(--easeL-text)" }}>
                          <User className="h-5 w-5 shrink-0" style={{ color: "var(--easeL-primary)" }} />
                          <span className={lang === "ur" ? "ur" : ""}>{lang === "ur" ? "پروفائل" : "Profile"}</span>
                        </Link>
                        <Link to="/progress" onClick={() => setProfileOpen(false)}
                          className="easeL-transition-fast flex min-h-12 items-center gap-3 px-4 py-3 text-base"
                          style={{ color: "var(--easeL-text)" }}>
                          <BarChart3 className="h-5 w-5 shrink-0" style={{ color: "var(--easeL-primary)" }} />
                          <span className={lang === "ur" ? "ur" : ""}>{lang === "ur" ? "ترقی" : "Progress"}</span>
                        </Link>
                        <button
                          onClick={() => { setProfileOpen(false); onSignOut(); }}
                          className="easeL-transition-fast flex w-full items-center gap-3 px-4 py-3 text-left"
                          style={{ color: "var(--easeL-accent-coral)" }}>
                          <LogOut className="w-5 h-5" />
                          <span className={lang === "ur" ? "ur" : ""}>{lang === "ur" ? "لاگ آؤٹ" : "Sign out"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : null
            ) : (
              <>
                <Link to="/signup"
                  className="easeL-interactive min-h-10 px-4 flex items-center justify-center rounded-xl border-2 font-semibold hover:opacity-95"
                  style={{ borderColor: "var(--easeL-primary)", color: "var(--easeL-link)" }}>
                  Get started
                </Link>
                <Link to="/login"
                  className="easeL-interactive min-h-10 px-5 flex items-center justify-center rounded-xl text-white font-semibold shadow-lg hover:opacity-95"
                  style={{ background: "var(--easeL-primary)" }}>
                  Sign in
                </Link>
              </>
            )}

            {showNavLinks && (
              <button type="button" onClick={() => setOpen((o) => !o)}
                className="flex h-10 w-10 items-center justify-center rounded-xl md:hidden"
                style={{ color: "var(--easeL-text-muted)" }} aria-label="Toggle menu">
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {showNavLinks && (
          <div className={`md:hidden overflow-hidden rounded-2xl bg-white/90 transition-all duration-300 ${open ? "max-h-80 opacity-100 mb-2" : "max-h-0 opacity-0"}`}>
            <div className="space-y-1 px-3 py-2">
              {navLinks.map(({ name, path, icon: Icon }) => (
                <NavLink key={name} to={path} onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    isActive
                      ? "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
                      : "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  }
                  style={({ isActive }) => isActive ? { background: ACTIVE_PILL_BG, color: ACTIVE_PILL_TEXT } : {}}>
                  {Icon && <Icon className="w-4 h-4" />}
                  {name}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── Wave chrome — sits directly below the bar, slides with it ── */}
      <div aria-hidden className="w-full overflow-hidden pointer-events-none"
        style={{ height: `${WAVE_H}px`, marginTop: "-1px", background: "transparent" }}>
        <svg viewBox="0 0 1440 32" preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{ display: "block" }}>
          {/* White "page" fills the background; coloured nav fills above the wave path */}
          
          <path
            d="M0,0 L1440,0 L1440,14
               C1380,14 1380,32 1320,32 C1260,32 1260,14 1200,14
               C1140,14 1140,32 1080,32 C1020,32 1020,14  960,14
               C 900,14  900,32  840,32 C 780,32  780,14  720,14
               C 660,14  660,32  600,32 C 540,32  540,14  480,14
               C 420,14  420,32  360,32 C 300,32  300,14  240,14
               C 180,14  180,32  120,32 C  60,32   60,14    0,14 Z"
            fill="#bfb2dd"
          />
        </svg>
      </div>
    </div>
  );
}
