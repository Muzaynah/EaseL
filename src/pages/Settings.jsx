import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Save, RotateCcw } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { UI_TOKENS } from "../theme/uiTokens";

const TABS = ["Accessibility", "Drawing"];

const DEFAULT_COLORS = [...new Set([UI_TOKENS.brush.default, ...UI_TOKENS.brush.palette])]

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
  defaultBrushColor: UI_TOKENS.brush.default,
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
    <div className="easeL-page-bg min-h-screen px-6 pb-16 easeL-page-top">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="easeL-heading-1">Settings</h1>
          <p className="easeL-text-muted mt-1">
            Caregiver controls for accessibility, sessions, and drawing.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`easeL-transition-standard min-h-12 px-5 rounded-2xl font-medium whitespace-nowrap ${
                  activeTab === tab ? "easeL-chip-selected font-semibold" : "hover:bg-white/80"
                }`}
                style={activeTab === tab ? undefined : { color: "var(--easeL-text-muted)" }}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="easeL-auth-card flex-1 p-6 md:p-8">
            {activeTab === "Accessibility" && (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Head tracking sensitivity: {form.headSensitivity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.headSensitivity}
                    onChange={(e) => update("headSensitivity", Number(e.target.value))}
                    className="h-3 w-full appearance-none rounded-full accent-[var(--easeL-primary)]"
                    style={{ background: "color-mix(in srgb, var(--easeL-border-subtle) 65%, white)" }}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Gesture sensitivity: {form.gestureSensitivity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.gestureSensitivity}
                    onChange={(e) => update("gestureSensitivity", Number(e.target.value))}
                    className="h-3 w-full appearance-none rounded-full accent-[var(--easeL-primary)]"
                    style={{ background: "color-mix(in srgb, var(--easeL-border-subtle) 65%, white)" }}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Dead zone: {form.deadZone}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.deadZone}
                    onChange={(e) => update("deadZone", Number(e.target.value))}
                    className="h-3 w-full appearance-none rounded-full accent-[var(--easeL-primary)]"
                    style={{ background: "color-mix(in srgb, var(--easeL-border-subtle) 65%, white)" }}
                  />
                </div>

                <div className="border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--easeL-border-subtle) 45%, transparent)" }}>
                  <label className="mb-1 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Rolling-neutral recalibration
                  </label>
                  <p className="mb-3 text-sm" style={{ color: "var(--easeL-text-muted)" }}>
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
                          className={`easeL-transition-standard text-left min-h-20 px-4 py-3 rounded-2xl border-2 ${
                            active
                              ? "border-[color:var(--easeL-primary)] bg-[color-mix(in_srgb,var(--easeL-primary)_12%,white)] ring-2 ring-[color:color-mix(in_srgb,var(--easeL-primary)_35%,transparent)]"
                              : "bg-white hover:bg-[color:var(--easeL-bg-page)]"
                          }`}
                          style={active ? undefined : { borderColor: "var(--easeL-border-strong)" }}
                        >
                          <span
                            className={`block font-semibold ${
                              active ? "easeL-accent-text-strong" : ""
                            }`}
                            style={active ? undefined : { color: "var(--easeL-text)" }}
                          >
                            {preset.label}
                          </span>
                          <span className="mt-1 block text-xs leading-snug" style={{ color: "var(--easeL-text-muted)" }}>
                            {preset.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--easeL-border-subtle) 45%, transparent)" }}>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Session length cap: {sessionLength} minutes
                  </label>
                  <p className="mb-2 text-sm" style={{ color: "var(--easeL-text-muted)" }}>
                    Framework §6.2 — scheduled breaks prompt every 5 min, session caps at this length.
                  </p>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={sessionLength}
                    onChange={(e) => setSessionLength(Number(e.target.value))}
                    className="h-3 w-full appearance-none rounded-full accent-[var(--easeL-primary)]"
                    style={{ background: "color-mix(in srgb, var(--easeL-border-subtle) 65%, white)" }}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 pt-2">
                  <div>
                    <p className="font-medium" style={{ color: "var(--easeL-text)" }}>Audio feedback</p>
                    <p className="text-sm" style={{ color: "var(--easeL-text-muted)" }}>Reward beeps and spoken cues.</p>
                  </div>
                  <Toggle value={form.audioFeedback} onChange={(v) => update("audioFeedback", v)} />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium" style={{ color: "var(--easeL-text)" }}>Dwell activation fallback</p>
                    <p className="text-sm" style={{ color: "var(--easeL-text-muted)" }}>
                      Use 3 s cursor dwell instead of mouth-open when gesture is unreliable (§3.4).
                    </p>
                  </div>
                  <Toggle value={useDwellActivation} onChange={setUseDwellActivation} />
                </div>

                <div>
                  <p className="mb-1 font-medium" style={{ color: "var(--easeL-text)" }}>Spoken language</p>
                  <p className="mb-2 text-sm" style={{ color: "var(--easeL-text-muted)" }}>
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
                        className={`easeL-transition-standard min-h-12 px-5 rounded-2xl font-medium ${
                          language === o.value
                            ? "bg-[var(--easeL-primary)] text-white"
                            : "hover:bg-[color:color-mix(in_srgb,var(--easeL-border-subtle)_30%,white)]"
                        }`}
                        style={
                          language === o.value
                            ? undefined
                            : { background: "var(--easeL-bg-section-alt)", color: "var(--easeL-text)" }
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Link
                  to="/calibration"
                  state={{ fromSettings: true }}
                  className="easeL-btn-outline inline-flex min-h-12 items-center justify-center px-6"
                >
                  Recalibrate
                </Link>
              </div>
            )}

            {activeTab === "Drawing" && (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Default brush size
                  </label>
                  <select
                    value={form.brushSize}
                    onChange={(e) => update("brushSize", e.target.value)}
                    className="easeL-input min-h-12 px-4"
                  >
                    {["S", "M", "L", "XL"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Default color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => update("defaultBrushColor", c)}
                        className={`easeL-transition-standard w-12 h-12 rounded-2xl border-2 ${
                          form.defaultBrushColor === c
                            ? "border-[color:var(--easeL-primary)] ring-2 ring-[color:color-mix(in_srgb,var(--easeL-primary)_30%,transparent)] ring-offset-2"
                            : "hover:border-[color:color-mix(in_srgb,var(--easeL-primary)_45%,transparent)]"
                        }`}
                        style={{
                          backgroundColor: c,
                          ...(form.defaultBrushColor === c ? {} : { borderColor: "var(--easeL-border-subtle)" }),
                        }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--easeL-text)" }}>
                    Canvas background
                  </label>
                  <div className="flex gap-2">
                    {["white", "grid", "transparent"].map((bg) => (
                      <button
                        key={bg}
                        onClick={() => update("canvasBg", bg)}
                        className={`easeL-transition-standard min-h-12 px-4 rounded-2xl font-medium capitalize ${
                          form.canvasBg === bg
                            ? "bg-[var(--easeL-primary)] text-white"
                            : "hover:bg-[color:color-mix(in_srgb,var(--easeL-border-subtle)_30%,white)]"
                        }`}
                        style={
                          form.canvasBg === bg
                            ? undefined
                            : { background: "var(--easeL-bg-section-alt)", color: "var(--easeL-text-muted)" }
                        }
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
            className="easeL-btn-solid inline-flex min-h-12 items-center justify-center gap-2 px-8"
          >
            <Save className="w-5 h-5" />
            Save changes
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="easeL-interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 px-6 font-semibold hover:bg-[color:var(--easeL-bg-page)]"
            style={{ borderColor: "var(--easeL-border-strong)", color: "var(--easeL-text)" }}
          >
            <RotateCcw className="w-5 h-5" />
            Reset to defaults
          </button>
          {saveFeedback && (
            <span className="text-sm font-medium" style={{ color: "var(--easeL-accent-mint)" }}>{saveFeedback}</span>
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
      className={`easeL-transition-standard h-8 w-14 shrink-0 rounded-full ${
        value ? "bg-[var(--easeL-primary)]" : ""
      }`}
      style={value ? undefined : { background: "color-mix(in srgb, var(--easeL-border-subtle) 65%, white)" }}
    >
      <span
        className={`easeL-transition-standard block w-6 h-6 rounded-full bg-white shadow transform ${
          value ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}
