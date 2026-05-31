const styles: Record<string, string> = {
  positive: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  neutral: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  negative: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

const labels: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  if (!sentiment) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[sentiment] || "bg-zinc-700 text-zinc-300"
      }`}
    >
      {labels[sentiment] || sentiment}
    </span>
  );
}
