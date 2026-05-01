import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Code2, ChevronUp } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { LESSON_STAGES } from "../utils/lessonContent";

const PAGE_LINKS = [
  { name: "Home", path: "/home" },
  { name: "Canvas", path: "/canvas" },
  { name: "Lessons", path: "/lessons" },
  { name: "Gallery", path: "/gallery" },
  { name: "Profile", path: "/profile" },
  { name: "Progress (caregiver)", path: "/progress" },
  { name: "Settings", path: "/settings" },
  { name: "Calibration", path: "/calibration" },
  { name: "Tutorial", path: "/tutorial" },
  { name: "Screener", path: "/screener" },
  { name: "Landing", path: "/" },
  { name: "Login", path: "/login" },
  { name: "Sign up", path: "/signup" },
];

const isDev = import.meta.env.DEV;

export default function DevMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { modeOverride, setModeOverride } = useAppState();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!isDev) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100]" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-medium shadow-lg"
        aria-label="Dev: jump to page"
      >
        <Code2 className="w-4 h-4" />
        <span>Dev</span>
        <ChevronUp className={`w-4 h-4 transition-transform ${open ? "rotate-0" : "rotate-180"}`} />
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-2 w-60 max-h-[70vh] overflow-y-auto rounded-2xl bg-white shadow-xl border-2 border-amber-200">
          <div className="p-3 bg-amber-50 border-b border-amber-200 sticky top-0">
            <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Dev only</p>
            <p className="text-xs text-amber-800 mt-0.5">{location.pathname || "/"}</p>
          </div>

          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Path override
            </p>
            <select
              value={modeOverride === null ? "profile" : String(modeOverride)}
              onChange={(e) => {
                const v = e.target.value;
                setModeOverride(v === "profile" ? null : Number(v));
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--easeL-focus-ring)]"
            >
              <option value="profile">Use stored profile</option>
              <option value="1">Simulate Path 1</option>
              <option value="2">Simulate Path 2</option>
            </select>
          </div>

          <div className="border-b border-slate-100 bg-[color-mix(in_srgb,var(--easeL-primary)_10%,white)] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--easeL-primary)]">
              Jump directly to a lesson level
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {LESSON_STAGES.map((s) => {
                const mode = s.mode === 1 ? 1 : 2;
                const path = mode === 1 ? "/lesson-path1" : "/lesson-path2";
                return (
                  <button
                    key={s.stage}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(`${path}?stage=${s.stage}`);
                    }}
                    className="rounded-lg border px-2 py-2 text-xs font-semibold text-[color:var(--easeL-primary)] hover:bg-[color-mix(in_srgb,var(--easeL-primary)_8%,white)]"
                    style={{ borderColor: "color-mix(in srgb, var(--easeL-primary) 35%, transparent)" }}
                    title={`${s.title} — Path ${mode}`}
                  >
                    L{s.stage}
                    <div className="text-[10px] font-normal text-slate-500 truncate">
                      {s.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="py-1">
            <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Jump to page
            </p>
            {PAGE_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium hover:bg-amber-50 ${
                  location.pathname === link.path ? "bg-amber-100 text-amber-900" : "text-slate-700"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
