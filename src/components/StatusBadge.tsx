import { STATUS_LABEL, type TicketStatus } from "@/lib/constants";

const COLOR: Record<TicketStatus, string> = {
  NEW: "bg-amber-500/15 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
  TRIAGED: "bg-sky-500/15 text-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.15)]",
  ASSIGNED: "bg-blue-500/15 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.15)]",
  IN_PROGRESS: "bg-violet-500/15 text-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.15)]",
  WAITING_REQUESTER: "bg-yellow-500/15 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.15)]",
  WAITING_PARTS: "bg-orange-500/15 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]",
  RESOLVED: "bg-emerald-500/15 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
  CLOSED: "bg-slate-500/15 text-slate-400 shadow-[0_0_8px_rgba(100,116,139,0.1)]",
  REOPENED: "bg-pink-500/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.15)]",
  CANCELLED: "bg-red-500/15 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]",
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${COLOR[status] ?? "bg-slate-500/15 text-slate-400"} transition-all duration-300`}
    >
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
