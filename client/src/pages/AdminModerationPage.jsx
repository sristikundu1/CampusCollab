import { Gavel, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { confirmAction } from "../lib/confirm-action.js";
import { apiError, reportApi } from "../services/api.js";

const label = (value) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export function AdminModerationPage() {
  const { notify } = useToast();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [outcome, setOutcome] = useState("NO_VIOLATION");
  const [reasonCode, setReasonCode] = useState("REVIEWED");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      setReports(
        (await reportApi.adminList({ status: "SUBMITTED" })).data.data.reports,
      );
    } catch (reason) {
      setError(apiError(reason).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const inspect = async (id) => {
    try {
      setSelected((await reportApi.adminGet(id)).data.data.report);
    } catch (reason) {
      notify(apiError(reason).message, "error");
    }
  };
  const resolve = async () => {
    if (!selected || !reasonCode.trim()) return;
    if (
      !(await confirmAction({
        title: "Apply moderation decision?",
        text: "This decision is audited. Content and account restrictions take effect immediately.",
        confirmText: "Apply decision",
        icon: "warning",
        danger: outcome !== "NO_VIOLATION" && outcome !== "WARNING",
      }))
    )
      return;
    setBusy(true);
    try {
      await reportApi.resolve(selected.id, {
        outcome,
        reasonCode: reasonCode.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      notify("Moderation decision recorded.");
      setSelected(null);
      setNote("");
      await load();
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div>
        <p className="eyebrow">Restricted administration</p>
        <h1 className="mt-2 text-3xl font-black">Moderation queue</h1>
        <p className="mt-2 text-slate-600">
          Review confidential reports and apply documented, auditable outcomes.
        </p>
        {error && (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_1.15fr]">
          <section className="surface p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <ShieldAlert className="text-rose-600" /> Open reports
            </h2>
            <div className="mt-5 space-y-3">
              {reports.map((report) => (
                <button
                  key={report.id}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50"
                  onClick={() => inspect(report.id)}
                >
                  <span className="text-xs font-black uppercase text-indigo-700">
                    {label(report.targetType)} · {report.priority}
                  </span>
                  <p className="mt-2 font-black">{label(report.reasonCode)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(report.submittedAt).toLocaleString()}
                  </p>
                </button>
              ))}
              {!reports.length && !error && (
                <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No submitted reports are waiting.
                </p>
              )}
            </div>
          </section>
          <section className="surface p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Gavel className="text-indigo-600" /> Decision
            </h2>
            {selected ? (
              <div className="mt-5">
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {selected.details || "No additional details were supplied."}
                </p>
                <label
                  className="mt-4 block text-sm font-bold"
                  htmlFor="outcome"
                >
                  Outcome
                </label>
                <select
                  id="outcome"
                  className="field mt-2"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                >
                  <option value="NO_VIOLATION">No violation</option>
                  <option value="WARNING">Warning</option>
                  <option value="CONTENT_RESTRICT">Restrict content</option>
                  <option value="CONTENT_HIDE">Hide content</option>
                  {selected.targetType === "USER" && (
                    <>
                      <option value="INDEFINITE_SUSPEND">
                        Suspend account
                      </option>
                    </>
                  )}
                </select>
                <label
                  className="mt-4 block text-sm font-bold"
                  htmlFor="reasonCode"
                >
                  Reason code
                </label>
                <input
                  id="reasonCode"
                  className="field mt-2"
                  maxLength={80}
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                />
                <label className="mt-4 block text-sm font-bold" htmlFor="note">
                  Internal decision note
                </label>
                <textarea
                  id="note"
                  className="field mt-2 min-h-28"
                  maxLength={4000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <button
                  className="btn-primary mt-5"
                  disabled={busy || !reasonCode.trim()}
                  onClick={resolve}
                >
                  Apply decision
                </button>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                Select a report to review its evidence.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
