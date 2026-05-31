export function formatResponseTime(minutes: number, hours: number): string {
  if (hours >= 1) return `${hours}h`;
  if (minutes >= 1) return `${minutes} min`;
  return "< 1 min";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
