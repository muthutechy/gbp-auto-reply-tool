"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { ReviewCard } from "@/components/ReviewCard";
import { api } from "@/lib/api";
import type { Review } from "@/types";

export default function ApprovalsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.getReviewsByStatus("awaiting_approval");
      setReviews(res.reviews);
      setEditedReplies(
        Object.fromEntries(
          res.reviews.map((r) => [r.id, r.ai_reply || r.final_reply || ""])
        )
      );
      setSelected({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  const allSelected = reviews.length > 0 && selectedIds.length === reviews.length;

  function toggleAll() {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const r of reviews) next[r.id] = true;
    setSelected(next);
  }

  function handleSelectChange(id: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  }

  async function handleApprove(id: string, reply: string) {
    await api.approveReview(id, reply);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleReject(id: string) {
    await api.rejectReview(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    setBulkMessage("");
    setError("");

    const items = selectedIds.map((id) => {
      const review = reviews.find((r) => r.id === id);
      const reply =
        editedReplies[id]?.trim() || review?.ai_reply?.trim() || review?.final_reply?.trim() || "";
      return { id, reply };
    });

    const invalid = items.filter((i) => !i.reply);
    if (invalid.length > 0) {
      setError("Each selected review needs a reply before bulk approve.");
      setBulkLoading(false);
      return;
    }

    try {
      const result = await api.bulkApproveReviews(items);
      setBulkMessage(`Approved ${result.succeeded} of ${items.length} reviews.`);
      if (result.failed > 0) {
        setError(`${result.failed} review(s) could not be approved.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk approve failed");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <PageHeader
          title="Approvals"
          description="Edit AI replies, regenerate, approve individually, or bulk-approve selected reviews"
        >
          {reviews.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <button
                type="button"
                disabled={bulkLoading || selectedIds.length === 0}
                onClick={handleBulkApprove}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {bulkLoading
                  ? "Approving…"
                  : `Approve selected (${selectedIds.length})`}
              </button>
            </div>
          )}
        </PageHeader>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}
        {bulkMessage && (
          <p className="mt-4 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {bulkMessage}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-zinc-500">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center text-zinc-500">
            No reviews pending approval.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showActions
                selectable
                selected={Boolean(selected[review.id])}
                onSelectChange={handleSelectChange}
                onReplyChange={(id, reply) =>
                  setEditedReplies((prev) => ({ ...prev, [id]: reply }))
                }
                onSaveReply={async (id, reply) => {
                  const res = await api.updateReview(id, { ai_reply: reply });
                  setReviews((prev) =>
                    prev.map((r) => (r.id === id ? res.review : r))
                  );
                }}
                onApprove={async (id, reply) => {
                  setEditedReplies((prev) => ({ ...prev, [id]: reply }));
                  await handleApprove(id, reply);
                }}
                onReject={handleReject}
                onRegenerate={async (id) => {
                  const res = await api.regenerateReview(id);
                  setReviews((prev) =>
                    prev.map((r) => (r.id === id ? res.review : r))
                  );
                  setEditedReplies((prev) => ({
                    ...prev,
                    [id]: res.review.ai_reply || "",
                  }));
                }}
              />
            ))}
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
