import { AlertTriangle, CalendarClock, KeyRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordInput } from "../components/PasswordInput.jsx";
import { useAuth } from "../context/auth-context.js";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { confirmAction } from "../lib/confirm-action.js";
import { accountApi, apiError } from "../services/api.js";

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const { expireSession } = useAuth();
  const { notify } = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const requestDeletion = async (event) => {
    event.preventDefault();
    if (confirmation !== "DELETE MY ACCOUNT") return;
    if (
      !(await confirmAction({
        title: "Schedule account deletion?",
        text: "Your sessions will end now. You have 30 days to recover the account before the deletion workflow begins.",
        confirmText: "Schedule deletion",
        icon: "warning",
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await accountApi.requestDeletion(password, confirmation);
      const deadline = new Date(
        result.data.data.deletion.recoveryDeadline,
      ).toLocaleDateString();
      expireSession();
      navigate("/recover-account", {
        replace: true,
        state: {
          message: `Deletion is scheduled. Recover the account before ${deadline}.`,
        },
      });
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Privacy and security</p>
        <h1 className="mt-2 text-3xl font-black">Account settings</h1>
        <section className="surface mt-7 p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black">Account access</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Password changes use the secure “Forgot password” flow from the
                sign-in page. Signing out revokes this browser session.
              </p>
            </div>
          </div>
        </section>
        <section className="mt-6 rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-rose-950">
                Delete account
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                This immediately signs you out and starts a 30-day recovery
                window. Shared collaboration history may be anonymized rather
                than erased so other participants keep accurate records.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <CalendarClock size={18} /> You can cancel during the recovery
            window.
          </div>
          <form className="mt-5" onSubmit={requestDeletion}>
            <label
              className="block text-sm font-bold"
              htmlFor="delete-password"
            >
              Current password
            </label>
            <PasswordInput
              id="delete-password"
              className="field"
              wrapperClassName="mt-2"
              visibilityLabel="current password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <label
              className="mt-4 block text-sm font-bold"
              htmlFor="delete-confirmation"
            >
              Type DELETE MY ACCOUNT
            </label>
            <input
              id="delete-confirmation"
              className="field mt-2"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-sm font-black text-white hover:bg-rose-800 disabled:opacity-50"
              disabled={
                busy || !password || confirmation !== "DELETE MY ACCOUNT"
              }
            >
              Schedule account deletion
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
