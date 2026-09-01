import {
  AlertCircle,
  Archive,
  CircleStop,
  Clock3,
  Eye,
  FileText,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GigCard } from "../components/gigs/GigCard.jsx";
import { useAuth } from "../context/auth-context.js";
import { useToast } from "../context/toast-context.js";
import { AppShell } from "../layouts/AppShell.jsx";
import { confirmAction } from "../lib/confirm-action.js";
import { clearPendingGig, readPendingGig } from "../lib/pending-gig.js";
import { apiError, gigApi } from "../services/api.js";

const confirmation = {
  publish: {
    title: "Publish this gig?",
    text: "It will become visible to eligible students and start accepting proposals.",
    confirmText: "Publish gig",
    icon: "question",
  },
  close: {
    title: "Close this gig?",
    text: "It will stop accepting proposals but remain in your history.",
    confirmText: "Close gig",
    icon: "warning",
    danger: true,
  },
  archive: {
    title: "Make this gig inactive?",
    text: "It will move to Archive and disappear from the public feed. You can restore it later.",
    confirmText: "Archive gig",
    icon: "warning",
    danger: true,
  },
  restore: {
    title: "Restore this gig?",
    text: "A previously published gig with a valid deadline will become active and visible again. Otherwise it returns as a draft.",
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
const actionClass =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-50";
const statusFilters = [
  "",
  "DRAFT",
  "PUBLISHED",
  "ASSIGNED",
  "PENDING",
  "CLOSED",
  "ARCHIVED",
];
const filterLabel = (value) =>
  value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^./, (letter) => letter.toUpperCase())
    : "All";

export function MyGigsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [gigs, setGigs] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pagination, setPagination] = useState({});
  const [pendingDraft, setPendingDraft] = useState(() =>
    readPendingGig(user?.id),
  );
  const requestSequence = useRef(0);
  const load = useCallback(
    async (cursor, append = false) => {
      const requestId = ++requestSequence.current;
      if (!append) setLoading(true);
      setError("");
      if (status === "PENDING") {
        setGigs([]);
        setPagination({ hasMore: false });
        setLoading(false);
        return;
      }
      try {
        const response = await gigApi.mine({
          ...(status ? { view: status } : {}),
          ...(cursor ? { cursor } : {}),
        });
        if (requestId !== requestSequence.current) return;
        setGigs((current) =>
          append
            ? [
                ...current,
                ...response.data.data.gigs.filter(
                  (gig) => !current.some((item) => item.id === gig.id),
                ),
              ]
            : response.data.data.gigs,
        );
        setPagination(response.data.meta.pagination);
      } catch (reason) {
        if (requestId === requestSequence.current)
          setError(apiError(reason).message);
      } finally {
        if (requestId === requestSequence.current) setLoading(false);
      }
    },
    [status],
  );
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refreshPending = () => setPendingDraft(readPendingGig(user?.id));
    window.addEventListener("focus", refreshPending);
    return () => window.removeEventListener("focus", refreshPending);
  }, [user?.id]);

  const discardPending = async () => {
    const confirmed = await confirmAction({
      title: "Discard unfinished gig?",
      text: "The locally saved incomplete gig will be removed. Published and saved draft gigs are not affected.",
      confirmText: "Discard pending gig",
      icon: "warning",
      danger: true,
    });
    if (!confirmed) return;
    clearPendingGig(user?.id);
    setPendingDraft(null);
    notify("Unfinished gig discarded.");
  };

  const transition = async (gig, action, body = {}) => {
    if (!(await confirmAction(confirmation[action]))) return;
    setBusy(gig.id);
    try {
      const updated = (await gigApi.transition(gig.id, action, body)).data.data
        .gig;
      setGigs((current) =>
        status && updated.status !== status
          ? current.filter((item) => item.id !== updated.id)
          : current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify(
        {
          publish: "Gig published.",
          close: "Gig closed.",
          archive: "Gig moved to Archive.",
          restore:
            updated.status === "PUBLISHED"
              ? "Gig restored and published."
              : "Gig restored as a draft.",
        }[action],
      );
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy("");
    }
  };
  const remove = async (gig) => {
    if (!(await confirmAction(confirmation.remove))) return;
    setBusy(gig.id);
    try {
      await gigApi.remove(gig.id);
      setGigs((current) => current.filter((item) => item.id !== gig.id));
      notify("Gig permanently deleted.");
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy("");
    }
  };

  const actions = (gig) => (
    <>
      {gig.proposalCount > 0 && (
        <Link
          className={`${actionClass} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
          to={`/dashboard/gigs/${gig.id}/proposals`}
        >
          <FileText size={14} /> Proposals ({gig.proposalCount})
        </Link>
      )}
      {["DRAFT", "PUBLISHED"].includes(gig.status) && (
        <Link
          className={`${actionClass} border-slate-200 text-slate-600 hover:bg-slate-50`}
          to={`/dashboard/gigs/${gig.id}/edit`}
        >
          <Pencil size={14} /> Edit
        </Link>
      )}
      {gig.status === "DRAFT" && (
        <button
          disabled={busy === gig.id}
          className={`${actionClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          onClick={() => transition(gig, "publish")}
        >
          <Rocket size={14} /> Publish
        </button>
      )}
      {gig.status === "PUBLISHED" && (
        <button
          disabled={busy === gig.id}
          className={`${actionClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
          onClick={() =>
            transition(gig, "close", { reasonCode: "OWNER_CLOSED" })
          }
        >
          <CircleStop size={14} /> Close
        </button>
      )}
      {["DRAFT", "CLOSED", "CANCELLED", "COMPLETED"].includes(gig.status) && (
        <button
          disabled={busy === gig.id}
          className={`${actionClass} border-slate-200 text-slate-600 hover:bg-slate-100`}
          onClick={() => transition(gig, "archive")}
        >
          <Archive size={14} /> Archive
        </button>
      )}
      {gig.status === "ARCHIVED" && (
        <button
          disabled={busy === gig.id}
          className={`${actionClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          onClick={() => transition(gig, "restore")}
        >
          <RotateCcw size={14} /> Restore active
        </button>
      )}
      {["DRAFT", "ARCHIVED"].includes(gig.status) &&
        gig.proposalCount === 0 &&
        gig.acceptedCount === 0 && (
          <button
            disabled={busy === gig.id}
            className={`${actionClass} border-rose-200 text-rose-700 hover:bg-rose-50`}
            onClick={() => remove(gig)}
          >
            <Trash2 size={14} /> Delete permanently
          </button>
        )}
    </>
  );

  return (
    <AppShell>
      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Owner workspace</p>
            <h1 className="mt-2 text-3xl font-bold">My Gigs</h1>
            <p className="mt-2 text-slate-600">
              Manage drafts, published opportunities, and retained history.
            </p>
          </div>
          <Link className="btn-primary" to="/dashboard/gigs/new">
            <Plus size={18} />
            Create Gig
          </Link>
        </div>
        <div
          className="mt-6 flex flex-wrap gap-2"
          aria-label="Filter gigs by status"
        >
          {statusFilters.map((value) => (
            <button
              key={value || "ALL"}
              aria-pressed={status === value}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${status === value ? "bg-brand-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50"}`}
              onClick={() => setStatus(value)}
            >
              {filterLabel(value)}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        ) : error ? (
          <div className="surface mt-7 p-8 text-center">
            <AlertCircle className="mx-auto text-rose-600" />
            <p className="mt-3">{error}</p>
            <button className="btn-primary mt-4" onClick={() => load()}>
              Try again
            </button>
          </div>
        ) : gigs.length === 0 &&
          !(pendingDraft && (!status || status === "PENDING")) ? (
          <div className="surface mt-7 p-10 text-center">
            <Eye className="mx-auto text-slate-400" />
            <h2 className="mt-4 text-xl font-bold">
              {status
                ? `No ${filterLabel(status).toLowerCase()} gigs in this view`
                : "No gigs in this view"}
            </h2>
            <p className="mt-2 text-slate-600">
              Choose another status or create a new gig.
            </p>
            {!status && (
              <Link className="btn-primary mt-5" to="/dashboard/gigs/new">
                Create your first gig
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-5 xl:grid-cols-2">
              {pendingDraft && (!status || status === "PENDING") && (
                <article className="surface overflow-hidden border-amber-200">
                  <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3">
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-800">
                      <Clock3 size={15} /> Pending
                    </span>
                    <span className="text-xs text-amber-700">
                      Saved on this device
                    </span>
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-black text-slate-950">
                      {pendingDraft.values.title?.trim() || "Untitled gig"}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {pendingDraft.values.description?.trim() ||
                        "Continue filling in the gig details before saving it as a draft."}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        className={`${actionClass} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
                        to="/dashboard/gigs/new"
                      >
                        <Pencil size={14} /> Continue editing
                      </Link>
                      <button
                        type="button"
                        className={`${actionClass} border-rose-200 text-rose-700 hover:bg-rose-50`}
                        onClick={discardPending}
                      >
                        <Trash2 size={14} /> Discard
                      </button>
                    </div>
                  </div>
                </article>
              )}
              {gigs.map((gig) => (
                <GigCard key={gig.id} gig={gig} ownerActions={actions(gig)} />
              ))}
            </div>
            {pagination.hasMore && (
              <div className="mt-7 text-center">
                <button
                  className="btn-secondary"
                  onClick={() => load(pagination.nextCursor, true)}
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
