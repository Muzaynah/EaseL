import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Small corner toast that appears for ~3 seconds when the user earns a new
 * stage.  Framework §3.5 "never display failure" — this component is ONLY
 * triggered on positive events (auto-advance); there is no sibling "failure"
 * component by design.
 */
export default function MasteryToast({ message, language = "en" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [message]);

  if (!message || !visible) return null;

  const label = language === "ur" ? "مبارک ہو! نیا مرحلہ" : "Congratulations! New stage unlocked";

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-scale-in">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white shadow-2xl border-2 border-indigo-200">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-slate-800 font-bold">{message}</p>
        </div>
      </div>
    </div>
  );
}
