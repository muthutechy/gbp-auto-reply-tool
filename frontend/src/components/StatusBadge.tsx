const styles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  awaiting_approval: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  approved: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  replied: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 ring-red-500/30",
};

const labels: Record<string, string> = {
  pending: "Pending",
  awaiting_approval: "Needs approval",
  approved: "Approved",
  replied: "Replied",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || "bg-zinc-700 text-zinc-300 ring-zinc-600"
      }`}
    >
      {labels[status] || status.replace(/_/g, " ")}
    </span>
  );
}
