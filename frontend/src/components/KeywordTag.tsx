interface KeywordTagProps {
  keyword: string;
  className?: string;
}

export function KeywordTag({ keyword, className = "" }: KeywordTagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 ${className}`}
    >
      {keyword}
    </span>
  );
}
