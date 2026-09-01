import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";
import { AppShell } from "../layouts/AppShell.jsx";

export function DashboardPage() {
  const { user } = useAuth();
  const score = user?.profile?.completionScore || 0;
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Your workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Welcome, {user?.profile?.displayName?.split(" ")[0] || "student"}.
        </h1>
        <p className="mt-2 text-slate-600">
          Here’s a clear view of your CampusCollab journey.
        </p>
        <section className="mt-8 grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <article className="surface overflow-hidden p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Profile completion
                </p>
                <p className="mt-2 text-4xl font-bold text-brand-950">
                  {score}%
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <UserRound />
              </span>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Add your skills, availability, and portfolio to help project
              owners understand what you bring.
            </p>
            <Link
              to="/dashboard/profile"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-600"
            >
              Complete profile <ArrowRight size={16} />
            </Link>
          </article>
          <article className="surface p-6">
            <p className="text-sm font-semibold text-slate-500">
              University access
            </p>
            <div className="mt-5 flex items-center gap-3">
              {user?.universityVerification?.status === "VERIFIED" ? (
                <CheckCircle2 className="text-emerald-600" />
              ) : (
                <CircleDashed className="text-amber-600" />
              )}
              <div>
                <p className="font-bold text-slate-900">
                  {user?.universityVerification?.status === "VERIFIED"
                    ? "Verified student"
                    : "UIU domain member"}
                </p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
          </article>
        </section>
        <section className="mt-5 grid gap-5 sm:grid-cols-2">
          <article className="surface p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <BriefcaseBusiness />
            </span>
            <h2 className="mt-4 font-bold">Find your next opportunity</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Explore live gigs from students across the CampusCollab community.
            </p>
            <Link className="btn-secondary mt-5" to="/gigs">
              Browse gigs <ArrowRight size={16} />
            </Link>
          </article>
          <article className="surface p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
              <FolderKanban />
            </span>
            <h2 className="mt-4 font-bold">Manage your gigs</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create drafts, publish opportunities, and manage their lifecycle.
            </p>
            <Link className="btn-secondary mt-5" to="/dashboard/gigs">
              Open My Gigs <ArrowRight size={16} />
            </Link>
          </article>
        </section>
        <section className="surface mt-5 p-6">
          <h2 className="font-bold">Recent activity</h2>
          <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Your activity will appear here
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Applications and invitations will arrive in the next feature
              phase.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
