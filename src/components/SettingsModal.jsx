import { useState, useEffect } from "react";
import { Save, RotateCcw, X } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { UI_TOKENS } from "../theme/uiTokens";

const TABS = ["Accessibility", "Drawing"];

const DEFAULT_COLORS = [UI_TOKENS.brush.default, ...UI_TOKENS.brush.palette];

const ACCESSIBILITY_DEFAULTS = {
  headSensitivity: 75,
  gestureSensitivity: 50,
  deadZone: 25,
  rollingNeutralStrength: 25,
  audioFeedback: true,
  highContrast: false,
  soundEffects: true,
};

const ROLLING_NEUTRAL_PRESETS = [
  { value: 0, label: "Off", description: "Pure one-time calibration." },
  { value: 25, label: "Gentle", description: "Slow drift correction (recommended)." },
  { value: 50, label: "Moderate", description: "For users whose pose changes mid-session." },
  { value: 80, label: "Strong", description: "Aggressive recentering for hypermobile users." },
];

const DRAWING_DEFAULTS = {
  brushSize: "M",
  defaultBrushColor: UI_TOKENS.brush.default,
  canvasBg: "white",
};

export default function SettingsModal({ isOpen, onClose }) {
  const { settings: persistedSettings, setSettings, profile, setProfile } = useAppState();

  const [activeTab, setActiveTab] = useState("Accessibility");
  const [form, setForm] = useState({ ...ACCESSIBILITY_DEFAULTS, ...DRAWING_DEFAULTS });
  const [sessionLength, setSessionLength] = useState(15);
  const [useDwellActivation, setUseDwellActivation] = useState(false);
  const [language, setLanguage] = useState("en");
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!persistedSettings) return;
    setForm((f) => ({
      ...f,
      headSensitivity: persistedSettings.headSensitivity ?? f.headSensitivity,
      gestureSensitivity: persistedSettings.gestureSensitivity ?? f.gestureSensitivity,
      deadZone: persistedSettings.deadZone ?? f.deadZone,
      rollingNeutralStrength: persistedSettings.rollingNeutralStrength ?? f.rollingNeutralStrength,
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

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    setSettings({ ...persistedSettings, ...form });
    setProfile((p) => ({
      ...(p || {}),
      sessionLengthPreference: sessionLength,
      useDwellActivation,
      caregiverReported: { ...(p?.caregiverReported || {}), language },
    }));
    setSaveFeedback("Saved");
    setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(false);
    setTimeout(() => setSaveFeedback(null), 2000);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) onClose();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      {/* Modal: flex-col so footer is always visible regardless of content height */}
      <div
        className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col"
        style={{ maxHeight: "82vh" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-800">Settings</h1>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab nav — horizontal pill row */}
        <div className="shrink-0 flex gap-2 px-5 pt-3 pb-2 border-b border-slate-100 bg-slate-50/60">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab
                  ? "bg-[var(--easeL-primary)] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "Accessibility" && (
            <div className="space-y-5">
              <SliderField
                label={`Head tracking sensitivity: ${form.headSensitivity}`}
                value={form.headSensitivity}
                onChange={(v) => update("headSensitivity", v)}
              />
              <SliderField
                label={`Gesture sensitivity: ${form.gestureSensitivity}`}
                value={form.gestureSensitivity}
                onChange={(v) => update("gestureSensitivity", v)}
              />
              <SliderField
                label={`Dead zone: ${form.deadZone}`}
                value={form.deadZone}
                onChange={(v) => update("deadZone", v)}
              />

              <div className="border-t border-slate-100 pt-4">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Rolling-neutral recalibration
                </label>
                <p className="mb-3 text-xs text-slate-500 leading-relaxed">
                  Gradually re-learns the user's resting head pose between strokes.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLLING_NEUTRAL_PRESETS.map((preset) => {
                    const active = form.rollingNeutralStrength === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => update("rollingNeutralStrength", preset.value)}
                        className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                          active
                            ? "border-[color:var(--easeL-primary)] bg-blue-50/60"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className={`block text-sm font-semibold ${active ? "text-[var(--easeL-primary)]" : "text-slate-700"}`}>
                          {preset.label}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Session length cap: {sessionLength} min
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={sessionLength}
                  onChange={(e) => setSessionLength(Number(e.target.value))}
                  className="h-2 w-full appearance-none rounded-full cursor-pointer accent-[var(--easeL-primary)]"
                  style={{ background: "color-mix(in srgb, var(--easeL-border-subtle) 65%, white)" }}
                />
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <ToggleRow label="Audio feedback" description="Reward beeps and spoken cues" value={form.audioFeedback} onChange={(v) => update("audioFeedback", v)} />
                <ToggleRow label="High contrast" description="Thicker outlines, higher-contrast targets" value={form.highContrast} onChange={(v) => update("highContrast", v)} />
                <ToggleRow label="Dwell activation" description="1s cursor dwell instead of mouth-open" value={useDwellActivation} onChange={setUseDwellActivation} />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Spoken language</p>
                <div className="flex gap-2">
                  {[{ value: "en", label: "English" }, { value: "ur", label: "اردو" }].map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setLanguage(o.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        language === o.value
                          ? "bg-[var(--easeL-primary)] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Drawing" && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Default brush size</label>
                <select
                  value={form.brushSize}
                  onChange={(e) => update("brushSize", e.target.value)}
                  className="easeL-input min-h-10 px-3 text-sm"
                >
                  {["S", "M", "L", "XL"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Default color</label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update("defaultBrushColor", c)}
                      className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                        form.defaultBrushColor === c
                          ? "border-[color:var(--easeL-primary)] ring-2 ring-[color:color-mix(in_srgb,var(--easeL-primary)_30%,transparent)] ring-offset-2 scale-110"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Canvas background</label>
                <div className="flex gap-2">
                  {["white", "grid", "transparent"].map((bg) => (
                    <button
                      key={bg}
                      onClick={() => update("canvasBg", bg)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                        form.canvasBg === bg
                          ? "bg-[var(--easeL-primary)] text-white"
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

        {/* Footer — always visible, never scrolls away */}
        <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={handleSave}
            className={`easeL-btn-solid inline-flex min-h-10 items-center justify-center gap-2 px-6 text-sm transition-all ${
              saveFeedback === "Saved" ? "bg-emerald-500" : ""
            }`}
          >
            <Save className="w-4 h-4" />
            {saveFeedback === "Saved" ? "Saved!" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          {saveFeedback && saveFeedback !== "Saved" && (
            <span className="text-sm font-medium text-emerald-600">{saveFeedback}</span>
          )}
          {hasUnsavedChanges && !saveFeedback && (
            <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full appearance-none rounded-full cursor-pointer accent-[var(--easeL-primary)]"
        style={{ background: "color-mix(in srgb, var(--easeL-border-subtle) 65%, white)" }}
      />
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`h-7 w-12 shrink-0 rounded-full transition-all duration-200 ${
        value ? "bg-[var(--easeL-primary)]" : "bg-slate-200"
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
