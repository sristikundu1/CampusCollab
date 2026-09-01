import {
  Bookmark,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MailCheck,
  Menu,
  Search,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Logo } from "../components/Logo.jsx";
import { UserMenu } from "../components/navigation/UserMenu.jsx";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/gigs", label: "Discover gigs", icon: Search },
  { to: "/dashboard/gigs", label: "My gigs", icon: BriefcaseBusiness },
  { to: "/dashboard/proposals", label: "My proposals", icon: FileText },
  { to: "/projects", label: "Discover projects", icon: FolderKanban },
  { to: "/dashboard/projects", label: "My projects", icon: FolderKanban },
  {
    to: "/dashboard/join-requests",
    label: "Join requests",
    icon: UserPlus,
  },
  { to: "/dashboard/invitations", label: "Invitations", icon: MailCheck },
  { to: "/dashboard/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close navigation" : "Open navigation"}
            >
              {open ? <X /> : <Menu />}
            </button>
            <Logo />
          </div>
          <UserMenu />
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[220px_1fr]">
        <aside
          className={`${open ? "block" : "hidden"} border-b border-slate-200 bg-white p-4 lg:block lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r`}
        >
          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`
                }
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
