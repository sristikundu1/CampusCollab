import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/auth-context.js";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { confirmAction } from "../lib/confirm-action.js";
import { apiError, completionApi } from "../services/api.js";

const label = (value) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export function CompletionsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [records, setRecords] = useState([]);
  const [role, setRole] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await completionApi.list({ role });
      setRecords(response.data.data.completionRecords);
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (record, decision) => {
    const disputed = decision === "DISPUTED";
    if (
      !(await confirmAction({
        title: disputed ? "Dispute this completion?" : "Confirm completion?",
        text: disputed
          ? "The engagement will remain pending and the owner will be notified. Use this only when work is not complete or the record is incorrect."
          : "This records your participation as completed and cannot be changed through the normal workflow.",
        confirmText: disputed ? "Dispute completion" : "Confirm completion",
        icon: disputed ? "warning" : "question",
        danger: disputed,
      }))
    )
      return;
    setBusy(record.id);
    try {
      const updated = (await completionApi.respond(record.id, decision)).data
        .data.completionRecord;
      setRecords((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify(disputed ? "Completion disputed." : "Completion confirmed.");
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Verified work history</p>
        <h1 className="mt-2 text-3xl font-black">Completions</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Confirm finished work, review owner requests, and keep an accurate
          record of completed collaborations.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Completion role">
          {["ALL", "PARTICIPANT", "OWNER"].map((value) => (
            <button
              key={value}
              aria-pressed={role === value}
              className={`rounded-full px-4 py-2 text-sm font-bold ${role === value ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
              onClick={() => setRole(value)}
            >
              {value === "ALL" ? "All records" : label(value)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-7 space-y-4">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        ) : error ? (
          <div className="surface mt-7 p-8 text-center">
            <AlertTriangle className="mx-auto text-rose-600" />
            <p className="mt-3 text-rose-700">{error}</p>
            <button className="btn-primary mt-4" onClick={load}>
              Try again
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="surface mt-7 p-10 text-center">
            <ClipboardCheck className="mx-auto text-slate-400" size={34} />
            <h2 className="mt-4 text-xl font-black">No completion records</h2>
            <p className="mt-2 text-slate-600">
              Records appear after an owner requests completion for active work.
            </p>
          </div>
        ) : (
          <div className="mt-7 space-y-4">
            {records.map((record) => {
              const participant = record.participantId === user?.id;
              const pending = record.status === "PENDING_ACKNOWLEDGEMENT";
              return (
                <article key={record.id} className="surface p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                          {record.resource?.type || label(record.contextType)}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${record.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : record.status === "DISPUTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {label(record.status)}
                        </span>
                      </div>
                      <h2 className="mt-3 truncate text-lg font-black text-slate-950">
                        {record.resource?.title || "Collaboration completion"}
                      </h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        {pending ? (
                          <Clock3 size={15} />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        Requested{" "}
                        {new Date(record.requestedAt).toLocaleDateString()}
                        {pending &&
                          ` · respond by ${new Date(record.responseDueAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    {participant && pending && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-primary"
                          disabled={busy === record.id}
                          onClick={() => respond(record, "ACKNOWLEDGED")}
                        >
                          <CheckCircle2 size={16} /> Confirm
                        </button>
                        <button
                          className="btn-secondary !text-rose-700"
                          disabled={busy === record.id}
                          onClick={() => respond(record, "DISPUTED")}
                        >
                          <AlertTriangle size={16} /> Dispute
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
