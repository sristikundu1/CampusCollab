import { ArrowLeft, Briefcase, GraduationCap, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiError, profileApi } from "../services/api.js";

export function PublicProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  useEffect(() => {
    Promise.all([profileApi.public(userId), profileApi.publicPortfolio(userId)])
      .then(([p, i]) => {
        setProfile(p.data.data.profile);
        setItems(i.data.data.items);
        setState("ready");
      })
      .catch((error) => {
        const parsed = apiError(error);
        setMessage(
          parsed.status === 404
            ? "This profile is private or does not exist."
            : parsed.message,
        );
        setState("error");
      });
  }, [userId]);
  if (state === "loading")
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <p className="font-semibold text-slate-500">Loading profile…</p>
      </main>
    );
  if (state === "error")
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="surface max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">Profile unavailable</h1>
          <p className="mt-2 text-slate-600">{message}</p>
          <Link className="btn-primary mt-6" to="/">
            <ArrowLeft size={16} />
            Return home
          </Link>
        </div>
      </main>
    );
  const initials = profile.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-700"
        >
          <ArrowLeft size={16} />
          CampusCollab
        </Link>
        <section className="surface mt-6 overflow-hidden">
          <div className="h-36 bg-[linear-gradient(120deg,#172554,#2856cc,#60a5fa)]" />
          <div className="px-6 pb-8 sm:px-9">
            <div className="-mt-14 grid size-28 place-items-center rounded-3xl border-4 border-white bg-brand-100 text-3xl font-black text-brand-700">
              {initials}
            </div>
            <h1 className="mt-4 text-3xl font-bold">{profile.displayName}</h1>
            <p className="mt-1 text-lg text-slate-600">{profile.headline}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
              <span className="inline-flex gap-2">
                <GraduationCap size={18} />
                {profile.university?.name}
              </span>
              <span className="inline-flex gap-2">
                <ShieldCheck size={18} />
                {profile.universityVerification?.status === "VERIFIED"
                  ? "Verified student"
                  : "University member"}
              </span>
            </div>
            <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-600">
              {profile.bio}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700"
                >
                  {skill.name} · {skill.level.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </section>
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <Briefcase className="text-brand-600" />
            <h2 className="text-2xl font-bold">Portfolio</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="surface p-6">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                {item.externalLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block text-sm font-bold text-brand-600"
                  >
                    {link.label || link.type}
                  </a>
                ))}
              </article>
            ))}
          </div>
          {!items.length && (
            <p className="surface mt-4 p-8 text-center text-slate-500">
              No published portfolio projects yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
