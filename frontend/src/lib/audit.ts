export function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    approve_review: "Approved review",
    reject_review: "Rejected review",
    auto_reply: "Auto reply",
    edit_reply: "Edited reply",
    regenerate_reply: "Regenerated AI reply",
  };
  return labels[action] || action.replace(/_/g, " ");
}

export function replyFromValue(value: Record<string, unknown> | null): string {
  if (!value) return "—";
  const reply =
    (value.final_reply as string) ||
    (value.ai_reply as string) ||
    "";
  return reply || "—";
}
