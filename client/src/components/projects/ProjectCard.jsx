import { ArrowRight, BriefcaseBusiness, Users } from "lucide-react";
import { Link } from "react-router-dom";
const label = (value) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
export function ProjectCard({ project }) {
  const capacity = project.openings.reduce((sum, o) => sum + o.capacity, 0),
    filled = project.openings.reduce((sum, o) => sum + o.filledCount, 0);
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="h-2 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              {label(project.projectType)}
            </span>
            <h2 className="mt-4 text-xl font-black leading-snug text-slate-950">
              {project.title}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${project.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}
          >
            {label(project.status)}
          </span>
        </div>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {project.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.skills.slice(0, 4).map((skill) => (
            <span
              key={skill.id}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
            >
              {skill.name}
            </span>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {project.owner.displayName}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Users size={14} />
              {filled}/{capacity} roles filled · {project.openings.length}{" "}
              opening{project.openings.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
            to={`/projects/${project.id}`}
          >
            View <ArrowRight size={15} />
          </Link>
        </div>
        {project.isOwner && (
          <Link
            to={`/my-projects/${project.id}/manage`}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700"
          >
            <BriefcaseBusiness size={15} />
            Manage collaboration
          </Link>
        )}
      </div>
    </article>
  );
}
