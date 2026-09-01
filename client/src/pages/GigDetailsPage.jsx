import {
  AlertCircle,
  ArrowLeft,
  Archive,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  CircleStop,
  Clock3,
  FileText,
  MapPin,
  Pencil,
  Rocket,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatBudget } from "../components/gigs/GigCard.jsx";
import { MarketplaceLayout } from "../components/gigs/MarketplaceLayout.jsx";
import { ProposalForm } from "../components/proposals/ProposalForm.jsx";
import { ProposalStatusBadge } from "../components/proposals/ProposalStatusBadge.jsx";
import { useAuth } from "../context/auth-context.js";
import { useToast } from "../context/toast-context.js";
import { confirmAction } from "../lib/confirm-action.js";
import { apiError, gigApi, proposalApi } from "../services/api.js";

const copy = {
  publish: {
    title: "Publish this gig?",
    text: "Eligible students will be able to discover it and submit proposals.",
    confirmText: "Publish gig",
    icon: "question",
  },
  close: {
    title: "Close this gig?",
    text: "This stops new proposals and keeps the gig in your history.",
    confirmText: "Close gig",
    icon: "warning",
    danger: true,
  },
  archive: {
    title: "Make this gig inactive?",
    text: "It will move to Archive and disappear from public discovery. You can restore it later.",
    confirmText: "Archive gig",
    icon: "warning",
    danger: true,
  },
  restore: {
    title: "Restore this gig?",
    text: "A previously published gig with a valid deadline will return to the active feed. Otherwise it returns as a draft.",
    confirmText: "Restore gig",
    icon: "question",
  },
  remove: {
    title: "Delete this gig permanently?",
    text: "This cannot be undone. The gig and its bookmarks will be permanently removed.",
    confirmText: "Delete permanently",
    icon: "error",
    danger: true,
  },
};

export function GigDetailsPage() {
  const { gigId } = useParams();
  const { isAuthenticated } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [application, setApplication] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextGig = (await gigApi.get(gigId)).data.data.gig;
      setGig(nextGig);
      if (!nextGig.isOwner) {
        const result = await proposalApi.mine({ gigId, limit: 1 });
        setApplication(result.data.data.proposals[0] ?? null);
      }
    } catch (reason) {
      const failure = apiError(reason);
      setError(
        failure.status === 404
          ? "This gig does not exist or is not visible."
          : failure.message,
      );
    } finally {
      setLoading(false);
    }
  }, [gigId]);
  useEffect(() => {
    void load();
  }, [load]);
  const bookmark = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      gig.isBookmarked
        ? await gigApi.removeBookmark(gig.id)
        : await gigApi.bookmark(gig.id);
      setGig({ ...gig, isBookmarked: !gig.isBookmarked });
      notify(gig.isBookmarked ? "Bookmark removed." : "Gig bookmarked.");
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const transition = async (action, body = {}) => {
    if (!(await confirmAction(copy[action]))) return;
    setBusy(true);
    try {
      const updated = (await gigApi.transition(gig.id, action, body)).data.data
        .gig;
      setGig(updated);
      notify(
        {
          publish: "Gig published.",
          close: "Gig closed.",
          archive: "Gig moved to Archive.",
          restore:
            updated.status === "PUBLISHED"
              ? "Gig restored and active."
              : "Gig restored as a draft.",
        }[action],
      );
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!(await confirmAction(copy.remove))) return;
    setBusy(true);
    try {
      await gigApi.remove(gig.id);
      notify("Gig permanently deleted.");
      navigate("/my-gigs", { replace: true });
    } catch (reason) {
      notify(apiError(reason).message, "error");
      setBusy(false);
    }
  };
  const submitProposal = async (body) => {
    setBusy(true);
    setApplyError("");
    try {
      const created = (await proposalApi.submit(gig.id, body)).data.data
        .proposal;
      setApplication(created);
      setShowForm(false);
      notify("Proposal submitted successfully.");
    } catch (reason) {
      const failure = apiError(reason);
      setApplyError(
        failure.code === "PROFILE_INCOMPLETE"
          ? "Complete at least 70% of your profile, including a bio and skill, before applying."
          : failure.message,
      );
      notify(
        failure.code === "PROFILE_INCOMPLETE"
          ? "Complete your profile before applying."
          : failure.message,
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <MarketplaceLayout>
        <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-3xl bg-slate-200" />
      </MarketplaceLayout>
    );
  if (error)
    return (
      <MarketplaceLayout>
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <AlertCircle className="mx-auto text-rose-600" />
          <h1 className="mt-4 text-xl font-bold">Gig not found</h1>
          <p className="mt-2 text-slate-600">{error}</p>
          <Link className="btn-primary mt-6" to="/gigs">
            Browse gigs
          </Link>
        </div>
      </MarketplaceLayout>
    );
  const canDelete =
    gig.isOwner &&
    ["DRAFT", "ARCHIVED"].includes(gig.status) &&
    gig.proposalCount === 0 &&
    gig.acceptedCount === 0;
  const initials = gig.owner.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <MarketplaceLayout>
      <div className="mx-auto max-w-6xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-700"
          to={gig.isOwner ? "/my-gigs" : "/gigs"}
        >
          <ArrowLeft size={16} />
          {gig.isOwner ? "Back to My Gigs" : "Back to opportunities"}
        </Link>
        {gig.isOwner && (
          <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-black text-slate-900">
                Owner controls
              </p>
              <p className="text-xs text-slate-500">
                Status: {gig.status} ·{" "}
                {gig.isActive === false ? "inactive" : "active"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["DRAFT", "PUBLISHED"].includes(gig.status) && (
                <Link
                  className="btn-secondary !px-4 !py-2"
                  to={`/gigs/${gig.id}/edit`}
                >
                  <Pencil size={15} />
                  Edit
                </Link>
              )}
              {gig.status === "DRAFT" && (
                <button
                  className="btn-primary !px-4 !py-2"
                  disabled={busy}
                  onClick={() => transition("publish")}
                >
                  <Rocket size={15} />
                  Publish
                </button>
              )}
              {gig.status === "PUBLISHED" && (
                <button
                  className="btn-secondary !px-4 !py-2"
                  disabled={busy}
                  onClick={() =>
                    transition("close", { reasonCode: "OWNER_CLOSED" })
                  }
                >
                  <CircleStop size={15} />
                  Close
                </button>
              )}
              {["DRAFT", "CLOSED", "CANCELLED", "COMPLETED"].includes(
                gig.status,
              ) && (
                <button
                  className="btn-secondary !px-4 !py-2"
                  disabled={busy}
                  onClick={() => transition("archive")}
                >
                  <Archive size={15} />
                  Archive
                </button>
              )}
              {gig.status === "ARCHIVED" && (
                <button
                  className="btn-primary !px-4 !py-2"
                  disabled={busy}
                  onClick={() => transition("restore")}
                >
                  <RotateCcw size={15} />
                  Restore active
                </button>
              )}
              {canDelete && (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
                  disabled={busy}
                  onClick={remove}
                >
                  <Trash2 size={15} />
                  Delete permanently
                </button>
              )}
            </div>
          </section>
        )}
        <article className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[radial-gradient(circle_at_85%_15%,rgba(96,165,250,.35),transparent_28%),linear-gradient(135deg,#172554,#1e3a8a)] p-7 text-white sm:p-10">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold">
                  {gig.category}
                </span>
                <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold">
                  {gig.workMode}
                </span>
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {gig.title}
              </h1>
              <div className="mt-6 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-white text-sm font-black text-brand-900">
                  {initials}
                </span>
                <div>
                  <Link
                    to={`/students/${gig.owner.id}`}
                    className="font-bold hover:underline"
                  >
                    {gig.owner.displayName}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-blue-100">
                    <ShieldCheck size={13} />
                    University community member
                  </p>
                </div>
              </div>
            </div>
            <div className="p-7 sm:p-10">
              <section>
                <p className="eyebrow">Opportunity overview</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  About this gig
                </h2>
                <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {gig.description}
                </p>
              </section>
              <section className="mt-9 border-t border-slate-100 pt-8">
                <h2 className="text-xl font-black text-slate-950">
                  Skills and experience
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  The owner is looking for collaborators with these
                  capabilities.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {gig.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-800"
                    >
                      <CheckCircle2 size={15} />
                      {skill.name}
                      <span className="font-medium text-brand-500">
                        · {skill.level.toLowerCase()}
                      </span>
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.08)] lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Budget
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatBudget(gig.budget)}
            </p>
            <dl className="mt-6 space-y-5 border-y border-slate-100 py-6 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 text-brand-600" size={18} />
                <div>
                  <dt className="text-slate-500">Work arrangement</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {gig.workMode}
                    {gig.locationText ? ` · ${gig.locationText}` : ""}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 text-brand-600" size={18} />
                <div>
                  <dt className="text-slate-500">Application deadline</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {gig.deadlineAt
                      ? new Date(gig.deadlineAt).toLocaleString()
                      : "Open deadline"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="mt-0.5 text-brand-600" size={18} />
                <div>
                  <dt className="text-slate-500">Team capacity</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {gig.acceptedCount} / {gig.capacity} places filled
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 text-brand-600" size={18} />
                <div>
                  <dt className="text-slate-500">Published</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {gig.publishedAt
                      ? new Date(gig.publishedAt).toLocaleDateString()
                      : "Not published"}
                  </dd>
                </div>
              </div>
            </dl>
            {gig.isOwner ? (
              <Link
                className="btn-primary mt-6 w-full"
                to={`/my-gigs/${gig.id}/proposals`}
              >
                <FileText size={17} />
                Review proposals ({gig.proposalCount})
              </Link>
            ) : application ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <ProposalStatusBadge status={application.status} />
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  You already submitted a proposal for this gig.
                </p>
                <Link
                  className="btn-primary mt-4 w-full"
                  to={`/proposals/${application.id}`}
                >
                  <FileText size={17} />
                  View your proposal
                </Link>
              </div>
            ) : gig.status === "PUBLISHED" &&
              gig.acceptingProposals &&
              gig.isActive !== false ? (
              <button
                className="btn-primary mt-6 w-full"
                onClick={() => setShowForm(true)}
              >
                <Send size={17} />
                Apply to this Gig
              </button>
            ) : (
              <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
                This gig is not accepting proposals.
              </div>
            )}
            {!gig.isOwner && (
              <button
                className="btn-secondary mt-3 w-full"
                disabled={busy}
                onClick={bookmark}
              >
                <Bookmark
                  size={17}
                  fill={gig.isBookmarked ? "currentColor" : "none"}
                />
                {gig.isBookmarked
                  ? "Remove from favourites"
                  : "Save to favourites"}
              </button>
            )}
          </aside>
        </article>
        {showForm && !application && (
          <section className="surface mt-7 p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Your application</p>
                <h2 className="mt-2 text-2xl font-black">Submit a proposal</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Share a focused plan. You can revise it while the owner is
                  reviewing it.
                </p>
              </div>
              <button
                className="btn-secondary !px-4 !py-2"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
            <ProposalForm
              gigBudget={gig.budget}
              onSubmit={submitProposal}
              busy={busy}
            />
          </section>
        )}
      </div>
    </MarketplaceLayout>
  );
}
