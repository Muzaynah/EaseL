import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Save, RotateCcw } from "lucide-react";
import { useAppState } from "../context/AppStateContext";

const TABS = ["Accessibility", "Drawing"];

const DEFAULT_COLORS = [
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const ACCESSIBILITY_DEFAULTS = {
  headSensitivity: 75,
  gestureSensitivity: 50,
  deadZone: 25,
  rollingNeutralStrength: 25,
  audioFeedback: true,
  highContrast: false,
  soundEffects: true,
};

/**
 * Rolling-neutral presets expressed in plain language for caregivers.
 * Framework §3.3 — recalibration catches long-term resting drift; too
 * aggressive and it fights deliberate tilts, too weak and hypermobile
 * users can't keep the cursor usable over a long session.
 */
const ROLLING_NEUTRAL_PRESETS = [
  {
    value: 0,
    label: "Off",
    description: "Pure one-time calibration. Best for users with a stable resting posture.",
  },
  {
    value: 25,
    label: "Gentle",
    description: "Slow drift correction. Minimal interference with strokes (recommended default).",
  },
  {
    value: 50,
    label: "Moderate",
    description: "Noticeable drift correction for users whose resting pose changes within a session.",
  },
  {
    value: 80,
    label: "Strong",
    description: "Aggressive recentering for highly hypermobile users. May fight long intentional tilts.",
  },
];

const DRAWING_DEFAULTS = {
  brushSize: "M",
  defaultBrushColor: "#000000",
  canvasBg: "white",
};

/**
 * Caregiver-facing settings. Framework §9 keeps pediatric data minimization always on,
 * so no "profile visibility" / "data collection" toggles. §6.2 session-length preference
 * and §3.4 dwell-activation fallback live on the profile.
 */
export default function Settings() {
  const { settings: persistedSettings, setSettings, profile, setProfile } = useAppState();

  const [activeTab, setActiveTab] = useState("Accessibility");
  const [form, setForm] = useState({ ...ACCESSIBILITY_DEFAULTS, ...DRAWING_DEFAULTS });
  const [sessionLength, setSessionLength] = useState(15);
  const [useDwellActivation, setUseDwellActivation] = useState(false);
  const [language, setLanguage] = useState("en");
  const [saveFeedback, setSaveFeedback] = useState(null);

  useEffect(() => {
    if (!persistedSettings) return;
    setForm((f) => ({
      ...f,
      headSensitivity: persistedSettings.headSensitivity ?? f.headSensitivity,
      gestureSensitivity: persistedSettings.gestureSensitivity ?? f.gestureSensitivity,
      deadZone: persistedSettings.deadZone ?? f.deadZone,
      rollingNeutralStrength:
        persistedSettings.rollingNeutralStrength ?? f.rollingNeutralStrength,
      audioFeedback: persistedSettings.audioFeedback ?? f.audioFeedback,
      highContrast: persistedSettings.highContrast ?? f.highContrast,
      soundEffects: persistedSettings.soundEffects ?? f.soundEffects,
      brushSize: persistedSettings.brushSize ?? f.brushSize,
      defaultBrushColor: persistedSettings.defaultBrushColor ?? f.defaultBrushColor,
      canvasBg: persistedSettings.canvasBg ?? f.canvasBg,
    }));
  }, [persistedSettings]);

  useEffect(() => {
    if (!profile) return;
    setSessionLength(profile.sessionLengthPreference ?? 15);
    setUseDwellActivation(profile.useDwellActivation ?? false);
    setLanguage(profile.caregiverReported?.language ?? "en");
  }, [profile]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    setSettings({ ...persistedSettings, ...form });
    setProfile((p) => ({
      ...(p || {}),
      sessionLengthPreference: sessionLength,
      useDwellActivation,
      caregiverReported: {
        ...(p?.caregiverReported || {}),
        language,
      },
    }));
    setSaveFeedback("Saved");
    setTimeout(() => setSaveFeedback(null), 2000);
  };

  const handleReset = () => {
    setForm({ ...ACCESSIBILITY_DEFAULTS, ...DRAWING_DEFAULTS });
    setSessionLength(15);
    setUseDwellActivation(false);
    setSettings({ ...persistedSettings, ...ACCESSIBILITY_DEFAULTS, ...DRAWING_DEFAULTS });
    setProfile((p) => ({
      ...(p || {}),
      sessionLengthPreference: 15,
      useDwellActivation: false,
    }));
    setSaveFeedback("Reset to defaults");
    setTimeout(() => setSaveFeedback(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-600 mt-1">
            Caregiver controls for accessibility, sessions, and drawing.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`min-h-12 px-5 rounded-2xl font-medium whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700"
                    : "text-slate-600 hover:bg-white/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex-1 bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/50">
            {activeTab === "Accessibility" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Head tracking sensitivity: {form.headSensitivity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.headSensitivity}
                    onChange={(e) => update("headSensitivity", Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gesture sensitivity: {form.gestureSensitivity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.gestureSensitivity}
                    onChange={(e) => update("gestureSensitivity", Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dead zone: {form.deadZone}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.deadZone}
                    onChange={(e) => update("deadZone", Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rolling-neutral recalibration
                  </label>
                  <p className="text-slate-500 text-sm mb-3">
                    Framework §3.3 — gradually re-learns the user's resting head
                    pose. Recalibration is always paused while a lesson stroke
                    is in progress, so this setting controls how much it
                    adjusts between attempts.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {ROLLING_NEUTRAL_PRESETS.map((preset) => {
                      const active = form.rollingNeutralStrength === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => update("rollingNeutralStrength", preset.value)}
                          className={`text-left min-h-20 px-4 py-3 rounded-2xl border transition-colors ${
                            active
                              ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`block font-semibold ${
                              active ? "text-indigo-700" : "text-slate-700"
                            }`}
                          >
                            {preset.label}
                          </span>
                          <span className="block text-xs text-slate-500 mt-1 leading-snug">
                            {preset.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Session length cap: {sessionLength} minutes
                  </label>
                  <p className="text-slate-500 text-sm mb-2">
                    Framework §6.2 — scheduled breaks prompt every 5 min, session caps at this length.
                  </p>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={sessionLength}
                    onChange={(e) => setSessionLength(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                  />
                </div>

                <div className="flex items-start justify-between gap-4 pt-2">
                  <div>
                    <p className="text-slate-700 font-medium">Audio feedback</p>
                    <p className="text-slate-500 text-sm">Reward beeps and spoken cues.</p>
                  </div>
                  <Toggle value={form.audioFeedback} onChange={(v) => update("audioFeedback", v)} />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-slate-700 font-medium">High contrast</p>
                    <p className="text-slate-500 text-sm">Thicker outlines, higher-contrast targets.</p>
                  </div>
                  <Toggle value={form.highContrast} onChange={(v) => update("highContrast", v)} />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-slate-700 font-medium">Dwell activation fallback</p>
                    <p className="text-slate-500 text-sm">
                      Use 1 s cursor dwell instead of mouth-open when gesture is unreliable (§3.4).
                    </p>
                  </div>
                  <Toggle value={useDwellActivation} onChange={setUseDwellActivation} />
                </div>

                <div>
                  <p className="text-slate-700 font-medium mb-1">Spoken language</p>
                  <p className="text-slate-500 text-sm mb-2">
                    Framework §8.4 — icon-first with optional audio.
                  </p>
                  <div className="flex gap-2">
                    {[
                      { value: "en", label: "English" },
                      { value: "ur", label: "اردو (Urdu)" },
                    ].map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setLanguage(o.value)}
                        className={`min-h-12 px-5 rounded-2xl font-medium transition-colors ${
                          language === o.value
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Link
                  to="/calibration"
                  state={{ fromSettings: true }}
                  className="inline-flex items-center justify-center min-h-12 px-6 rounded-2xl border-2 border-indigo-500 text-indigo-600 font-semibold hover:bg-indigo-50 transition-all"
                >
                  Recalibrate
                </Link>
              </div>
            )}

            {activeTab === "Drawing" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default brush size
                  </label>
                  <select
                    value={form.brushSize}
                    onChange={(e) => update("brushSize", e.target.value)}
                    className="w-full min-h-12 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {["S", "M", "L", "XL"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => update("defaultBrushColor", c)}
                        className={`w-12 h-12 rounded-2xl border-2 transition-colors ${
                          form.defaultBrushColor === c
                            ? "border-indigo-500 ring-2 ring-indigo-200 ring-offset-2"
                            : "border-slate-200 hover:border-indigo-400"
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Canvas background
                  </label>
                  <div className="flex gap-2">
                    {["white", "grid", "transparent"].map((bg) => (
                      <button
                        key={bg}
                        onClick={() => update("canvasBg", bg)}
                        className={`min-h-12 px-4 rounded-2xl font-medium capitalize ${
                          form.canvasBg === bg
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-8 items-center">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
          >
            <Save className="w-5 h-5" />
            Save changes
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Reset to defaults
          </button>
          {saveFeedback && (
            <span className="text-emerald-600 font-medium text-sm">{saveFeedback}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-14 h-8 rounded-full transition-colors shrink-0 ${
        value ? "bg-indigo-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
          value ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}
