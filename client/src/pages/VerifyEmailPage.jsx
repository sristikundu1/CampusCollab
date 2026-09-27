import { MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Spinner } from "../components/Spinner.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { apiError, authApi } from "../services/api.js";
export function VerifyEmailPage() {
  const location = useLocation();
  const shouldRequestCode = location.state?.requestCode === true;
  const requestedCode = useRef(false);
  const [state, setState] = useState(shouldRequestCode ? "loading" : "waiting");
  const [message, setMessage] = useState(
    shouldRequestCode
      ? "Requesting a verification code for your account..."
      : location.state?.message ||
          "Enter the 6-digit code sent to your university email.",
  );
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(
    location.state?.expiresInSeconds || 600,
  );
  const resend = async () => {
    setState("loading");
    try {
      const { data } = await authApi.resend(email);
      setMessage(data.data.message);
      setRemaining(data.data.expiresInSeconds || 600);
      setCode("");
      setState("waiting");
    } catch (error) {
      setMessage(apiError(error).message);
      setState("error");
    }
  };
  useEffect(() => {
    if (!shouldRequestCode || requestedCode.current) return;
    requestedCode.current = true;
    void resend();
  }, [shouldRequestCode]);
  useEffect(() => {
    if (state !== "waiting" || remaining <= 0) return undefined;
    const timer = window.setInterval(
      () => setRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [remaining, state]);
  const verify = async (event) => {
    event.preventDefault();
    setState("loading");
    try {
      const { data } = await authApi.verify(email, code);
      setMessage(data.data.message);
      setState("success");
    } catch (error) {
      setMessage(apiError(error).message);
      setState("error");
    }
  };
  const busy = state === "loading";
  return (
    <AuthLayout
      eyebrow="Verify your identity"
      title="Check your university email"
      subtitle="Verification unlocks the trusted CampusCollab community."
    >
      <div className="surface p-7 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <MailCheck size={30} />
        </span>
        <p
          className={`mt-5 text-sm leading-6 ${state === "error" ? "text-rose-700" : "text-slate-600"}`}
          role={state === "error" ? "alert" : "status"}
        >
          {message}
        </p>
        {state === "success" ? (
          <Link to="/login" className="btn-primary mt-6 w-full">
            Continue to sign in
          </Link>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={verify} noValidate>
            <input
              aria-label="University email"
              className="field"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              aria-label="Verification code"
              className="field text-center font-mono text-xl tracking-[0.35em]"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />
            <p className="text-xs text-slate-500">
              {remaining > 0
                ? `Code expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                : "This code has expired. Request a new one."}
            </p>
            <button
              className="btn-primary w-full"
              disabled={busy || !email || code.length !== 6 || remaining <= 0}
            >
              {busy ? <Spinner label="Verifying code" /> : "Verify email"}
            </button>
            <button
              className="btn-secondary w-full"
              type="button"
              disabled={busy || !email}
              onClick={resend}
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
