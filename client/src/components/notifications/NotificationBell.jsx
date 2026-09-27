import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { notificationApi } from "../../services/api.js";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await notificationApi.unreadCount();
      setCount(response.data.data.unreadCount);
    } catch {
      // The page provides the actionable error state; a header badge should
      // remain unobtrusive during a transient request failure.
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("notifications:changed", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("notifications:changed", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const label = count
    ? `Notifications, ${count} unread`
    : "Notifications, none unread";
  return (
    <Link
      to="/dashboard/notifications"
      aria-label={label}
      className="relative grid size-10 shrink-0 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <Bell size={21} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
