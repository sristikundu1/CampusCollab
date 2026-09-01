import { Link } from "react-router-dom";
export function Logo({ light = false }) {
  return (
    <Link
      to="/"
      className="group inline-flex items-center gap-2.5 rounded-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
      aria-label="CampusCollab home"
    >
      <img
        src={
          light
            ? "/brand/campuscollab-mark-light.svg"
            : "/brand/campuscollab-mark.svg"
        }
        alt=""
        width="40"
        height="40"
        className="size-10 shrink-0 transition-transform duration-200 group-hover:scale-105"
      />
      <span
        className={`text-[1.05rem] ${light ? "text-white" : "text-brand-950"}`}
      >
        Campus<span className="text-brand-500">Collab</span>
      </span>
    </Link>
  );
}
