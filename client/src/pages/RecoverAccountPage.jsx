import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { accountApi, apiError } from "../services/api.js";

export function RecoverAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recover = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await accountApi.cancelDeletion(email, password);
      navigate("/login", {
        replace: true,
        state: { message: response.data.data.recovery.message },
      });
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout
      title="Recover your account"
      subtitle="Cancel a scheduled deletion during the 30-day recovery window."
    >
      {message && (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      <form className="space-y-4" onSubmit={recover}>
        <div>
          <label className="text-sm font-bold" htmlFor="recovery-email">
            Email
          </label>
          <input
            id="recovery-email"
            className="field mt-2"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="recovery-password">
            Password
          </label>
          <input
            id="recovery-password"
            className="field mt-2"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          <RotateCcw size={17} /> Recover account
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        <Link className="font-bold text-indigo-700" to="/login">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
