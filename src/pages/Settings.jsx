import { useState } from "react";
import { Link } from "react-router-dom";
import { Save, RotateCcw } from "lucide-react";

const tabs = ["General", "Accessibility", "Drawing", "Privacy", "Account"];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("General");
  const [theme, setTheme] = useState("light");
  const [autoSave, setAutoSave] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [headSensitivity, setHeadSensitivity] = useState(75);
  const [gestureSensitivity, setGestureSensitivity] = useState(50);
  const [deadZone, setDeadZone] = useState(25);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [brushSize, setBrushSize] = useState("M");
  const [canvasBg, setCanvasBg] = useState("white");
  const [layers, setLayers] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("private");
  const [dataCollection, setDataCollection] = useState(false);

  const colors = [
    "#000000",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Tabs */}
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map((tab) => (
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
            {activeTab === "General" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                  <div className="flex gap-2">
                    {["light", "dark"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`min-h-12 px-6 rounded-2xl font-medium capitalize ${
                          theme === t
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                  <select className="w-full min-h-12 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option>English</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Auto-save</span>
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      autoSave ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                        autoSave ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Sound effects</span>
                  <button
                    onClick={() => setSoundEffects(!soundEffects)}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      soundEffects ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                        soundEffects ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "Accessibility" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Head tracking sensitivity: {headSensitivity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={headSensitivity}
                    onChange={(e) => setHeadSensitivity(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gesture sensitivity: {gestureSensitivity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={gestureSensitivity}
                    onChange={(e) => setGestureSensitivity(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dead zone: {deadZone}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={deadZone}
                    onChange={(e) => setDeadZone(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-indigo-500"
                  />
                </div>
                <Link
                  to="/calibration"
                  className="inline-flex items-center justify-center min-h-12 px-6 rounded-2xl border-2 border-indigo-500 text-indigo-600 font-semibold hover:bg-indigo-50 transition-all"
                >
                  Recalibrate
                </Link>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Enable audio feedback</span>
                  <button
                    onClick={() => setAudioFeedback(!audioFeedback)}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      audioFeedback ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                        audioFeedback ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">High contrast mode</span>
                  <button
                    onClick={() => setHighContrast(!highContrast)}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      highContrast ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                        highContrast ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "Drawing" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default brush size
                  </label>
                  <select
                    value={brushSize}
                    onChange={(e) => setBrushSize(e.target.value)}
                    className="w-full min-h-12 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {["S", "M", "L", "XL"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="w-12 h-12 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 transition-colors"
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
                        onClick={() => setCanvasBg(bg)}
                        className={`min-h-12 px-4 rounded-2xl font-medium capitalize ${
                          canvasBg === bg
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Enable layers</span>
                  <button
                    onClick={() => setLayers(!layers)}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      layers ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                        layers ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "Privacy" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Profile visibility
                  </label>
                  <select
                    value={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.value)}
                    className="w-full min-h-12 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Allow data collection</span>
                  <button
                    onClick={() => setDataCollection(!dataCollection)}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      dataCollection ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                        dataCollection ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <button
                  type="button"
                  className="min-h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  Export my data
                </button>
              </div>
            )}

            {activeTab === "Account" && (
              <div className="space-y-4">
                <button
                  type="button"
                  className="w-full min-h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  Change password
                </button>
                <p className="text-slate-600">Connected accounts: Google</p>
                <button
                  type="button"
                  className="w-full min-h-12 px-6 rounded-2xl border-2 border-red-300 text-red-600 font-semibold hover:bg-red-50 transition-all"
                >
                  Delete account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-95 transition-all"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
