import {
  CheckCircle2,
  CircleSlash2,
  Clock3,
  Eye,
  Star,
  Undo2,
} from "lucide-react";

const styles = {
  SUBMITTED: ["Submitted", "bg-blue-50 text-blue-700 ring-blue-200", Clock3],
  SHORTLISTED: [
    "Shortlisted",
    "bg-amber-50 text-amber-800 ring-amber-200",
    Star,
  ],
  ACCEPTED: [
    "Accepted",
    "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CheckCircle2,
  ],
  REJECTED: [
    "Not selected",
    "bg-rose-50 text-rose-700 ring-rose-200",
    CircleSlash2,
  ],
  WITHDRAWN: ["Withdrawn", "bg-slate-100 text-slate-600 ring-slate-200", Undo2],
  CLOSED: ["Closed", "bg-slate-100 text-slate-600 ring-slate-200", Eye],
};
export function ProposalStatusBadge({ status }) {
  const [label, className, Icon] = styles[status] ?? [
    status,
    "bg-slate-100 text-slate-600 ring-slate-200",
    Eye,
  ];
  return (
    <span
      aria-label={`Proposal status: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}
    >
      <Icon size={13} />
      {label}
    </span>
  );
}
