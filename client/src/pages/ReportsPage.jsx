import { AlertTriangle, Flag, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { apiError, reportApi } from "../services/api.js";

const reasons = [
  ["HARASSMENT", "Harassment"],
  ["SPAM", "Spam"],
  ["SCAM_OR_FRAUD", "Scam or fraud"],
  ["HATE_OR_ABUSE", "Hate or abuse"],
  ["INAPPROPRIATE_CONTENT", "Inappropriate content"],
  ["IMPERSONATION", "Impersonation"],
  ["PRIVACY_VIOLATION", "Privacy violation"],
  ["OTHER", "Other"],
];
const label = (value) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();
  const targetType = searchParams.get("targetType");
  const targetId = searchParams.get("targetId");
  const [reports, setReports] = useState([]);
  const [reasonCode, setReasonCode] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReports((await reportApi.mine()).data.data.reports);
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    if (!targetType || !targetId) return;
    setSubmitting(true);
    try {
      await reportApi.create({
        targetType,
        targetId,
        reasonCode,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      notify("Report submitted securely.");
      setDetails("");
      setSearchParams({});
      await load();
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Trust and safety</p>
        <h1 className="mt-2 text-3xl font-black">Reports</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Report harmful behavior or content privately. The reported person
          cannot see your identity through CampusCollab.
        </p>
        {targetType && targetId && (
          <form className="surface mt-7 p-6" onSubmit={submit}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
                <Flag size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black">Submit a private report</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Reporting {label(targetType)} content
                </p>
              </div>
            </div>
            <label className="mt-5 block text-sm font-bold" htmlFor="reason">
              Reason
            </label>
            <select
              id="reason"
              className="field mt-2"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
            >
              {reasons.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-sm font-bold" htmlFor="details">
              Details (optional)
            </label>
            <textarea
              id="details"
              className="field mt-2 min-h-32"
              maxLength={5000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Share relevant context without including passwords or private credentials."
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="btn-primary" disabled={submitting}>
                <Flag size={16} /> Submit report
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSearchParams({})}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        <section className="surface mt-7 p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-indigo-600" />
            <h2 className="text-xl font-black">Your report history</h2>
          </div>
          {loading ? (
            <div className="mt-5 h-28 animate-pulse rounded-2xl bg-slate-100" />
          ) : error ? (
            <div className="mt-5 rounded-2xl bg-rose-50 p-5 text-rose-700">
              <AlertTriangle />
              <p className="mt-2">{error}</p>
              <button className="btn-secondary mt-3" onClick={load}>
                Try again
              </button>
            </div>
          ) : reports.length ? (
            <div className="mt-5 space-y-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-black">
                      {label(report.targetType)} report
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Submitted{" "}
                      {new Date(report.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {label(report.status)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              You have not submitted any reports.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
