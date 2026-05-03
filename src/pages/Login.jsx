import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, setError, error, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      const nextPath = await signIn(email.trim(), password);
      navigate(nextPath || "/home", { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="easeL-page-bg flex items-center justify-center px-4 py-20 sm:px-6">
      <div className="w-full max-w-md">
        <div className="easeL-auth-card p-8 sm:p-10">
          <h1
            className="easeL-heading-1 mb-2 text-center sm:text-4xl"
            style={{ color: "var(--easeL-text)" }}
          >
            Sign in to EaseL
          </h1>
          <p className="mb-8 text-center text-lg" style={{ color: "var(--easeL-text-muted)" }}>
            Enter the email and password for this account
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

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-base font-semibold"
                style={{ color: "var(--easeL-text)" }}
              >
                Email
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
                  className="easeL-input pr-14"
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            </div>

            <div className="flex min-h-12 items-center gap-3">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="easeL-checkbox"
              />
              <label
                htmlFor="remember"
                className="text-base"
                style={{ color: "var(--easeL-text)" }}
              >
                Remember me
              </label>
            </div>

            <button type="submit" disabled={submitting || loading} className="easeL-btn-primary">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6">
            <button
              type="button"
              className="easeL-interactive flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 bg-white text-base font-semibold"
              style={{ borderColor: "var(--easeL-border)", color: "var(--easeL-text)" }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                style={{ background: "var(--easeL-border-subtle)" }}
              >
                G
              </span>
              Sign in with Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="easeL-link text-base" aria-label="Back to EaseL intro">
              Back
            </Link>
          </div>

          <p
            className="mt-6 text-center text-base"
            style={{ color: "var(--easeL-text-muted)" }}
          >
            No account?{" "}
            <Link to="/signup" className="easeL-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
