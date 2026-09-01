import { Check, Clock3, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../layouts/AppShell.jsx";
import { confirmAction } from "../lib/confirm-action.js";
import { useToast } from "../context/toast-context.js";
import { apiError, participationApi } from "../services/api.js";
export function ParticipationInboxPage({ type }) {
  const invitation = type === "invitations",
    { notify } = useToast();
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      const r = invitation
        ? await participationApi.myInvitations()
        : await participationApi.myJoins();
      setItems(r.data.data[invitation ? "invitations" : "joinRequests"]);
    } catch (e) {
      setError(apiError(e).message);
    }
  }, [invitation]);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (item, action) => {
    if (
      !(await confirmAction({
        title: `${action[0].toUpperCase() + action.slice(1)} this ${invitation ? "invitation" : "request"}?`,
        text: "The project membership workflow will be updated immediately.",
        confirmText: action[0].toUpperCase() + action.slice(1),
        danger: ["reject", "withdraw"].includes(action),
        icon: ["reject", "withdraw"].includes(action) ? "warning" : "question",
      }))
    )
      return;
    setBusy(item.id);
    try {
      invitation
        ? await participationApi.invitationAction(item.id, action)
        : await participationApi.joinAction(item.id, action);
      notify("Response saved.");
      await load();
    } catch (e) {
      notify(apiError(e).message, "error");
    } finally {
      setBusy("");
    }
  };
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Participation</p>
        <h1 className="mt-2 text-3xl font-black">
          {invitation ? "Project invitations" : "My join requests"}
        </h1>
        <p className="mt-2 text-slate-600">
          {invitation
            ? "Review invitations from project owners."
            : "Track requests you sent to project teams."}
        </p>
        {error && (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-7 space-y-4">
          {items.map((item) => (
            <article key={item.id} className="surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {item.status}
                  </span>
                  <h2 className="mt-3 text-xl font-black">
                    {item.project.title}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-indigo-700">
                    Role: {item.opening.roleName}
                  </p>
                  {item.message && (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>
                  )}
                </div>
                <Link
                  className="btn-secondary !px-4 !py-2"
                  to={`/projects/${item.project.id}`}
                >
                  <ExternalLink size={15} />
                  View project
                </Link>
              </div>
              {item.status === "PENDING" && (
                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  {invitation ? (
                    <>
                      <button
                        disabled={busy === item.id}
                        className="btn-primary"
                        onClick={() => act(item, "accept")}
                      >
                        <Check size={16} />
                        Accept
                      </button>
                      <button
                        disabled={busy === item.id}
                        className="btn-secondary"
                        onClick={() => act(item, "reject")}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={busy === item.id}
                      className="btn-secondary"
                      onClick={() => act(item, "withdraw")}
                    >
                      <X size={16} />
                      Withdraw request
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
          {!items.length && !error && (
            <div className="surface p-10 text-center">
              <Clock3 className="mx-auto text-slate-400" />
              <h2 className="mt-4 text-xl font-black">Nothing here yet</h2>
              <Link className="btn-primary mt-5" to="/projects">
                Discover projects
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
