import { Link } from "react-router-dom";
import { Logo } from "../Logo.jsx";

const groups = [
  {
    title: "Explore",
    links: [
      ["Find gigs", "/gigs"],
      ["Projects", "/projects"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Dashboard", "/dashboard"],
      ["Profile", "/dashboard/profile"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-9 px-5 py-10 sm:grid-cols-[minmax(0,1.5fr)_1fr_1fr] sm:px-8">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            Connect with university talent, collaborate on meaningful work, and
            build experience together.
          </p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={`${group.title} footer links`}>
            <h2 className="text-sm font-bold text-white">{group.title}</h2>
            <div className="mt-3 grid gap-2">
              {group.links.map(([label, to]) => (
                <Link
                  key={to}
                  to={to}
                  className="w-fit text-sm text-slate-400 transition hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        ))}
      </div>
      <div className="border-t border-slate-800">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-slate-500 sm:px-8">
          © CampusCollab {new Date().getFullYear()}. Built for student
          collaboration.
        </p>
      </div>
    </footer>
  );
}
