import { useMemo, useState } from "react";
import { useAppState } from "../context/AppStateContext";

const QUESTIONS = [
  {
    id: "motion",
    label: "Cursor movement",
    options: [
      { id: "none", label: "Not moving" },
      { id: "too-little", label: "Too little" },
      { id: "too-much", label: "Too much" },
      { id: "ok", label: "Okay" },
    ],
  },
  {
    id: "mouth",
    label: "Activation reliability",
    options: [
      { id: "misses", label: "Misses often" },
      { id: "false", label: "False triggers" },
      { id: "ok", label: "Okay" },
    ],
  },
  {
    id: "fatigue",
    label: "Control over time",
    options: [
      { id: "worse", label: "Gets worse quickly" },
      { id: "steady", label: "Steady enough" },
    ],
  },
];

export default function TroubleshootAssist() {
  const { settings, setSettings, profile, setProfile } = useAppState();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({});
  const [changeText, setChangeText] = useState("");

  const complete = useMemo(
    () => QUESTIONS.every((q) => Boolean(answers[q.id])),
    [answers],
  );

  function apply() {
    const before = {
      headSensitivity: settings?.headSensitivity ?? 75,
      deadZone: settings?.deadZone ?? 25,
      rollingNeutralStrength: settings?.rollingNeutralStrength ?? 25,
      useDwellActivation: profile?.useDwellActivation ?? false,
    };
    const next = { ...before };
    if (answers.motion === "none") next.headSensitivity = Math.min(100, next.headSensitivity + 10);
    if (answers.motion === "too-little") next.headSensitivity = Math.min(100, next.headSensitivity + 6);
    if (answers.motion === "too-much") next.headSensitivity = Math.max(20, next.headSensitivity - 8);
    if (answers.motion === "too-much") next.deadZone = Math.min(50, next.deadZone + 6);
    if (answers.motion === "none") next.deadZone = Math.max(5, next.deadZone - 5);
    if (answers.mouth === "misses") next.useDwellActivation = true;
    if (answers.mouth === "false") next.useDwellActivation = true;
    if (answers.fatigue === "worse") {
      next.rollingNeutralStrength = Math.min(80, next.rollingNeutralStrength + 10);
    }
    setSettings((s) => ({
      ...s,
      headSensitivity: next.headSensitivity,
      deadZone: next.deadZone,
      rollingNeutralStrength: next.rollingNeutralStrength,
    }));
    setProfile((p) => ({
      ...(p || {}),
      useDwellActivation: next.useDwellActivation,
    }));
    setChangeText(
      `Updated sensitivity ${before.headSensitivity} -> ${next.headSensitivity}, dead zone ${before.deadZone} -> ${next.deadZone}, rolling neutral ${before.rollingNeutralStrength} -> ${next.rollingNeutralStrength}${before.useDwellActivation !== next.useDwellActivation ? ", activation switched to dwell" : ""}.`,
    );
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="easeL-btn-outline inline-flex min-h-11 items-center gap-1.5 px-3.5 text-xs font-semibold sm:text-sm"
      >
        This is not working
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-4">
            <h3 className="text-lg font-bold text-slate-800">Quick adjustment</h3>
            <p className="text-xs text-slate-500 mb-3">
              Answer 3 questions. We apply small and reversible changes.
            </p>
            <div className="space-y-3">
              {QUESTIONS.map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-semibold text-slate-700">{q.label}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {q.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                        className={`min-h-9 px-3 rounded-lg text-xs font-semibold ${
                          answers[q.id] === o.id
                            ? "bg-[var(--easeL-primary)] text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={apply}
                disabled={!complete}
                className="flex-1 min-h-10 rounded-lg bg-[var(--easeL-primary)] font-semibold text-white disabled:opacity-50"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 min-h-10 rounded-lg bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {changeText ? (
        <div
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold"
          style={{
            borderColor: "color-mix(in srgb, var(--easeL-primary) 30%, transparent)",
            color: "var(--easeL-primary)",
          }}
        >
          {changeText}
        </div>
      ) : null}
    </>
  );
}

