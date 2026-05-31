export function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const starClass = size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`inline-flex gap-0.5 font-semibold ${starClass}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-zinc-700"}>
          ★
        </span>
      ))}
    </span>
  );
}
