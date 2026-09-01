import { Link, NavLink } from "react-router-dom";
import { Logo } from "../Logo.jsx";
import { Spinner } from "../Spinner.jsx";
import { useAuth } from "../../context/auth-context.js";
import { UserMenu } from "./UserMenu.jsx";

const publicLinks = [
  { to: "/gigs", label: "Find gigs" },
  { to: "/projects", label: "Projects" },
];

export function SiteHeader() {
  const { loading, isAuthenticated } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:h-18 sm:grid-cols-[1fr_auto_1fr] sm:px-8">
        <Logo />
        <nav
          className="hidden items-center gap-1 sm:flex"
          aria-label="Public navigation"
        >
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex justify-end">
          {loading ? (
            <span className="grid size-10 place-items-center text-brand-600">
              <Spinner label="Loading account" />
            </span>
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <Link to="/register" className="btn-primary !px-4 !py-2.5">
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
