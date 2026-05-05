import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  LANGUAGE_OPTIONS,
  SESSION_LENGTH_OPTIONS,
} from "../utils/profileSchema";

function passwordStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 6) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(3, s);
}

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, setError, error, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguage] = useState("en");
  const [sessionLengthPreference, setSessionLengthPreference] = useState(15);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);
  const match = !confirmPassword || password === confirmPassword;

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return;
    if (password !== confirmPassword) return;
    setSubmitting(true);
    try {
      const nextPath = await signUp(email.trim(), password, {
        name: displayName.trim() || "User",
        email: email.trim(),
        caregiverReported: {
          language,
          sessionLengthPreference: Number(sessionLengthPreference) || 15,
        },
      });
      navigate(nextPath || "/calibration", { replace: true });
    } catch (err) {
      setError(err.message || "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="easeL-page-bg flex items-center justify-center px-4 pb-20 easeL-page-top sm:px-6">
      <div className="w-full max-w-md">
        <div className="easeL-auth-card p-8 sm:p-10">
          <h1
            className="easeL-heading-1 mb-2 text-center sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            Create an account
          </h1>
          <p className="mb-8 text-center text-lg" style={{ color: "var(--easeL-text-muted)" }}>
            For a child or young person: caregiver creates the account and can record preferences
            used during setup and lessons.
          </p>

          {error && (
            <div
              className="mb-4 rounded-2xl border-2 p-4 text-base"
              style={{
                borderColor: "color-mix(in srgb, var(--easeL-accent-coral) 40%, white)",
                background: "color-mix(in srgb, var(--easeL-accent-coral) 12%, white)",
                color: "var(--easeL-text)",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="mb-2 block text-base font-semibold"
                style={{ color: "var(--easeL-text)" }}
              >
                Child or young person’s name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="easeL-input"
                placeholder="Name"
                autoComplete="name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-base font-semibold"
                style={{ color: "var(--easeL-text)" }}
              >
                Email (used to sign in)
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="easeL-input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-base font-semibold"
                style={{ color: "var(--easeL-text)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="easeL-input pr-14"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="easeL-transition-fast absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-3 hover:bg-[color:color-mix(in_srgb,var(--easeL-primary)_8%,white)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-6 w-6" style={{ color: "var(--easeL-text-muted)" }} />
                  ) : (
                    <Eye className="h-6 w-6" style={{ color: "var(--easeL-text-muted)" }} />
                  )}
                </button>
              </div>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full transition-colors"
                    style={{
                      background: i <= strength ? "var(--easeL-primary)" : "var(--easeL-border-subtle)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-base font-semibold"
                style={{ color: "var(--easeL-text)" }}
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="easeL-input pr-14"
                  style={
                    confirmPassword && !match
                      ? { borderColor: "var(--easeL-accent-coral)" }
                      : undefined
                  }
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="easeL-transition-fast absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-3 hover:bg-[color:color-mix(in_srgb,var(--easeL-primary)_8%,white)]"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="h-6 w-6" style={{ color: "var(--easeL-text-muted)" }} />
                  ) : (
                    <Eye className="h-6 w-6" style={{ color: "var(--easeL-text-muted)" }} />
                  )}
                </button>
              </div>
              {confirmPassword && !match && (
                <p className="mt-2 text-base" style={{ color: "var(--easeL-accent-coral)" }}>Passwords do not match</p>
              )}
            </div>

            <div>
              <label
                htmlFor="language"
                className="mb-2 block text-base font-semibold"
                style={{ color: "var(--easeL-text)" }}
              >
                Language preference
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="easeL-input"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sessionLength"
                className="mb-2 block text-base font-semibold"
                style={{ color: "var(--easeL-text)" }}
              >
                Session length preference
              </label>
              <select
                id="sessionLength"
                value={sessionLengthPreference}
                onChange={(e) => setSessionLengthPreference(Number(e.target.value))}
                className="easeL-input"
              >
                {SESSION_LENGTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={submitting || loading} className="easeL-btn-primary">
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-base" style={{ color: "var(--easeL-text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" className="easeL-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
