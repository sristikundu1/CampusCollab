import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context.js";
import { useToast } from "../../context/toast-context.js";
import { Avatar } from "../Avatar.jsx";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const signOut = async () => {
    setOpen(false);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      notify("Could not sign out. Please try again.", "error");
    }
  };

  const avatarUrl = user?.profile?.avatarUrl;
  const label = user?.profile?.displayName || user?.email || "Account menu";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="grid size-10 place-items-center overflow-hidden rounded-full border-2 border-white bg-brand-100 text-xs font-black text-brand-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300 focus-visible:ring-4 focus-visible:ring-brand-100"
        aria-label={`Open account menu for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar
          src={avatarUrl}
          email={user?.email}
          name={user?.profile?.displayName}
          className="size-full text-xs"
        />
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,.18)]"
          role="menu"
        >
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-bold text-slate-900">{label}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {user?.email}
            </p>
          </div>
          <Link
            to="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
          >
            <LayoutDashboard size={17} /> Dashboard
          </Link>
          <Link
            to="/dashboard/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
          >
            <UserRound size={17} /> Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 focus:bg-rose-50"
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
