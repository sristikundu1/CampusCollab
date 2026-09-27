import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../components/Spinner.jsx";
import { AppShell } from "../layouts/AppShell.jsx";
import { apiError, notificationApi } from "../services/api.js";

function relativeTime(value) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size)
      return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, "second");
}

const changed = () => window.dispatchEvent(new Event("notifications:changed"));

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [marking, setMarking] = useState(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  async function load(nextCursor = null) {
    nextCursor ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const response = await notificationApi.list({
        limit: 20,
        ...(nextCursor ? { cursor: nextCursor } : {}),
      });
      const received = response.data.data.notifications;
      setItems((current) =>
        nextCursor ? [...current, ...received] : received,
      );
      setCursor(response.data.meta.pagination.nextCursor);
      setHasMore(response.data.meta.pagination.hasMore);
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openNotification(notification) {
    if (marking.has(notification.id)) return;
    if (!notification.isRead) {
      setMarking((current) => new Set(current).add(notification.id));
      try {
        const response = await notificationApi.markRead(notification.id);
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id
              ? response.data.data.notification
              : item,
          ),
        );
        changed();
      } catch (reason) {
        setError(apiError(reason).message);
        setMarking((current) => {
          const next = new Set(current);
          next.delete(notification.id);
          return next;
        });
        return;
      }
      setMarking((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
    }
    if (notification.destination) navigate(notification.destination);
  }

  async function markAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    setError("");
    try {
      const response = await notificationApi.markAllRead();
      const readAt = response.data.data.readState.readAt;
      setItems((current) =>
        current.map((item) => ({ ...item, isRead: true, readAt })),
      );
      changed();
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setMarkingAll(false);
    }
  }

  const unread = items.filter((item) => !item.isRead).length;
  return (
    <AppShell>
      <section
        className="mx-auto w-full max-w-3xl"
        aria-labelledby="notifications-title"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Activity</p>
            <h1
              id="notifications-title"
              className="text-2xl font-bold text-slate-950 sm:text-3xl"
            >
              Notifications
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {unread
                ? `${unread} unread in this list`
                : "You're all caught up."}
            </p>
          </div>
          {items.some((item) => !item.isRead) && (
            <button
              type="button"
              className="btn-secondary !px-4 !py-2.5"
              onClick={markAllRead}
              disabled={markingAll}
            >
              <CheckCheck size={18} aria-hidden="true" />
              {markingAll ? "Marking…" : "Mark all as read"}
            </button>
          )}
        </div>

        {error && (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {error}{" "}
            {!items.length && (
              <button
                className="ml-2 font-bold underline"
                onClick={() => load()}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="card grid min-h-52 place-items-center">
            <Spinner label="Loading notifications" />
          </div>
        ) : items.length === 0 ? (
          <div className="card grid min-h-64 place-items-center text-center">
            <div>
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Bell aria-hidden="true" />
              </span>
              <h2 className="font-bold text-slate-950">You're all caught up</h2>
              <p className="mt-1 text-sm text-slate-600">
                Important activity will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    disabled={marking.has(notification.id)}
                    className={`flex w-full min-w-0 items-start gap-3 p-4 text-left transition hover:bg-slate-50 sm:p-5 ${notification.isRead ? "bg-white" : "bg-brand-50/60"}`}
                  >
                    <span
                      className={`mt-2 size-2 shrink-0 rounded-full ${notification.isRead ? "bg-slate-300" : "bg-brand-600"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block break-words text-sm ${notification.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-950"}`}
                      >
                        {notification.title}
                      </span>
                      <span className="mt-1 block break-words text-sm text-slate-600">
                        {notification.message}
                      </span>
                      <time
                        className="mt-2 block text-xs font-medium text-slate-500"
                        dateTime={notification.createdAt}
                      >
                        {relativeTime(notification.createdAt)}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="border-t border-slate-100 p-4 text-center">
                <button
                  className="btn-secondary"
                  onClick={() => load(cursor)}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
