"use client";

export interface ReviewFilterValues {
  status: string;
  rating: string;
  sentiment: string;
  dateFrom: string;
  dateTo: string;
}

interface ReviewFiltersProps {
  values: ReviewFilterValues;
  onChange: (values: ReviewFilterValues) => void;
}

export function ReviewFilters({ values, onChange }: ReviewFiltersProps) {
  function set<K extends keyof ReviewFilterValues>(key: K, value: ReviewFilterValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</span>
        <select
          value={values.status}
          onChange={(e) => set("status", e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="awaiting_approval">Needs approval</option>
          <option value="replied">Replied</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Rating</span>
        <select
          value={values.rating}
          onChange={(e) => set("rating", e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="">All</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} stars
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sentiment</span>
        <select
          value={values.sentiment}
          onChange={(e) => set("sentiment", e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="">All</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">From</span>
        <input
          type="date"
          value={values.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">To</span>
        <input
          type="date"
          value={values.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        />
      </label>

      <button
        type="button"
        onClick={() =>
          onChange({
            status: "",
            rating: "",
            sentiment: "",
            dateFrom: "",
            dateTo: "",
          })
        }
        className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
      >
        Clear
      </button>
    </div>
  );
}
