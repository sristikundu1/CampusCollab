import { AlertCircle, ArrowRight, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProposalStatusBadge } from "../components/proposals/ProposalStatusBadge.jsx";
import { AppShell } from "../layouts/AppShell.jsx";
import { apiError, proposalApi } from "../services/api.js";

const statuses = [
  "",
  "SUBMITTED",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
];
const label = (value) =>
  value
    ? value.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
    : "All";
export function MyProposalsPage() {
  const [status, setStatus] = useState("");
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProposals(
        (await proposalApi.mine(status ? { status } : {})).data.data.proposals,
      );
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <AppShell>
      <div>
        <p className="eyebrow">Applicant workspace</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          My Proposals
        </h1>
        <p className="mt-2 text-slate-600">
          Track every application and keep active proposals up to date.
        </p>
        <div
          className="mt-6 flex flex-wrap gap-2"
          aria-label="Filter proposals by status"
        >
          {statuses.map((value) => (
            <button
              key={value || "ALL"}
              className={`rounded-full px-4 py-2 text-sm font-bold ${status === value ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-brand-50"}`}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {label(value)}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="mt-7 h-48 animate-pulse rounded-3xl bg-slate-200" />
        ) : error ? (
          <div className="surface mt-7 p-8 text-center">
            <AlertCircle className="mx-auto text-rose-600" />
            <p className="mt-3">{error}</p>
            <button className="btn-primary mt-4" onClick={load}>
              Try again
            </button>
          </div>
        ) : proposals.length === 0 ? (
          <div className="surface mt-7 p-10 text-center">
            <FileText className="mx-auto text-slate-400" />
            <h2 className="mt-4 text-xl font-bold">No proposals here yet</h2>
            <p className="mt-2 text-slate-600">
              Browse active gigs and submit a thoughtful application.
            </p>
            <Link className="btn-primary mt-5" to="/gigs">
              Find a gig
            </Link>
          </div>
        ) : (
          <div className="mt-7 grid gap-4">
            {proposals.map((proposal) => (
              <Link
                key={proposal.id}
                to={`/proposals/${proposal.id}`}
                className="surface group flex flex-col justify-between gap-5 p-5 transition hover:-translate-y-0.5 hover:border-brand-300 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ProposalStatusBadge status={proposal.status} />
                    <span className="text-xs text-slate-500">
                      Submitted{" "}
                      {new Date(proposal.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-black text-slate-950">
                    {proposal.gig.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Owned by{" "}
                    {proposal.gig.owner?.displayName ?? "CampusCollab member"} ·
                    Revision {proposal.currentRevisionNumber}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-700">
                  View proposal <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
