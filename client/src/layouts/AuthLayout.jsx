import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo.jsx";
export function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(520px,.95fr)]">
      <section className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -left-24 top-20 size-80 rounded-full bg-brand-500/25 blur-3xl" />
        <Logo light />
        <div className="relative my-auto max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">
            Built for university talent
          </p>
          <h2 className="mt-5 text-5xl font-bold leading-tight">
            Skills become experience when the right people connect.
          </h2>
          <p className="mt-6 text-lg leading-8 text-blue-100/80">
            Discover meaningful work, build credible projects, and collaborate
            inside a trusted student community.
          </p>
          <div className="mt-10 grid gap-4 text-sm text-blue-50">
            {[
              "Verified university community",
              "Skill-first collaboration",
              "One profile for work and projects",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="text-blue-300" size={20} />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-blue-200/60">
          CampusCollab · Learn together. Build what matters.
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
            <Link to="/" className="text-sm text-slate-500">
              <ArrowLeft className="inline" size={16} /> Home
            </Link>
          </div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
