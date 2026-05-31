"use client";

import { useEffect, useRef, useState } from "react";
import type { Review } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { StarRating } from "./StarRating";
import { SentimentBadge } from "./SentimentBadge";
import { KeywordTag } from "./KeywordTag";
import { formatDate } from "@/lib/format";

interface ReviewCardProps {
  review: Review;
  showActions?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (id: string, selected: boolean) => void;
  onApprove?: (id: string, reply: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onRegenerate?: (id: string) => Promise<void>;
  onReplyChange?: (id: string, reply: string) => void;
  onSaveReply?: (id: string, reply: string) => Promise<void>;
  showQuickActions?: boolean;
}

export function ReviewCard({
  review,
  showActions,
  selectable,
  selected,
  onSelectChange,
  onApprove,
  onReject,
  onRegenerate,
  onReplyChange,
  onSaveReply,
  showQuickActions,
}: ReviewCardProps) {
  const [reply, setReply] = useState(review.ai_reply || review.final_reply || "");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const initialReply = useRef(review.ai_reply || review.final_reply || "");

  useEffect(() => {
    const next = review.ai_reply || review.final_reply || "";
    setReply(next);
    initialReply.current = next;
  }, [review.ai_reply, review.final_reply, review.id]);

  useEffect(() => {
    if (!showActions || !onSaveReply) return;
    if (reply === initialReply.current) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await onSaveReply(review.id, reply);
        initialReply.current = reply;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [reply, showActions, onSaveReply, review.id]);

  async function handleApprove() {
    if (!onApprove) return;
    setLoading(true);
    try {
      await onApprove(review.id, reply);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!onReject) return;
    setLoading(true);
    try {
      await onReject(review.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate(review.id);
    } finally {
      setRegenerating(false);
    }
  }

  const canAct =
    review.status === "awaiting_approval" ||
    review.status === "pending" ||
    (review.ai_reply && review.status !== "replied" && review.status !== "rejected");

  return (
    <article
      className={`rounded-xl border bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-5 shadow-sm transition ${
        selected ? "border-emerald-500/50 ring-1 ring-emerald-500/30" : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-start gap-3">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectChange?.(review.id, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600"
              aria-label="Select review"
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={review.rating} />
              <StatusBadge status={review.status} />
              <SentimentBadge sentiment={review.sentiment} />
            </div>
            <p className="mt-1.5 text-sm text-zinc-400">
              {review.reviewer_name || "Anonymous"} · {formatDate(review.created_at)}
            </p>
            {review.keyword_used && (
              <div className="mt-2">
                <KeywordTag keyword={review.keyword_used} />
              </div>
            )}
          </div>
        </div>
      </div>

      {review.comment && (
        <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Customer review</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-200">{review.comment}</p>
        </div>
      )}

      {(review.ai_reply || showActions) && (
        <div className="mt-4 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/80">
            {showActions ? "Edit AI reply (saved as final reply on approve)" : "AI reply"}
          </p>
          {showActions ? (
            <>
              <textarea
                id={`reply-${review.id}`}
                value={reply}
                onChange={(e) => {
                  setReply(e.target.value);
                  onReplyChange?.(review.id, e.target.value);
                }}
                rows={4}
                className="mt-2 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-relaxed text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              {onSaveReply && saveStatus !== "idle" && (
                <p className="mt-1 text-xs text-zinc-500">
                  {saveStatus === "saving" ? "Saving draft…" : "Draft saved"}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/90">
              {review.ai_reply || review.final_reply || "—"}
            </p>
          )}
        </div>
      )}

      {review.final_reply && review.status === "replied" && review.final_reply !== review.ai_reply && (
        <div className="mt-3 rounded-lg border border-zinc-800 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Posted reply</p>
          <p className="mt-1 text-sm text-zinc-300">{review.final_reply}</p>
        </div>
      )}

      {(showActions || showQuickActions) && canAct && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-4">
          {onRegenerate && (
            <button
              type="button"
              disabled={regenerating || loading}
              onClick={handleRegenerate}
              className="rounded-lg border border-violet-600/50 bg-violet-950/30 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-900/40 disabled:opacity-50"
            >
              {regenerating ? "Regenerating…" : "Regenerate AI"}
            </button>
          )}
          {onApprove && (
            <button
              type="button"
              disabled={loading || !reply.trim()}
              onClick={handleApprove}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {onReject && (
            <button
              type="button"
              disabled={loading}
              onClick={handleReject}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </article>
  );
}
