"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewFilters, type ReviewFilterValues } from "@/components/ReviewFilters";
import { api } from "@/lib/api";
import type { Review } from "@/types";

const defaultFilters: ReviewFilterValues = {
  status: "",
  rating: "",
  sentiment: "",
  dateFrom: "",
  dateTo: "",
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ReviewFilterValues>(defaultFilters);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getReviews(true, {
        status: filters.status || undefined,
        rating: filters.rating ? Number(filters.rating) : undefined,
        sentiment: filters.sentiment || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });
      setReviews(res.reviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id: string, reply: string) {
    await api.approveReview(id, reply);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleReject(id: string) {
    await api.rejectReview(id);
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
  }

  async function handleRegenerate(id: string) {
    const res = await api.regenerateReview(id);
    setReviews((prev) => prev.map((r) => (r.id === id ? res.review : r)));
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <PageHeader
          title="Reviews"
          description="Filter, approve, reject, or regenerate AI replies"
        />

        <div className="mt-6">
          <ReviewFilters values={filters} onChange={setFilters} />
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        {!loading && (
          <p className="mt-4 text-sm text-zinc-500">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-zinc-500">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center text-zinc-500">
            No reviews match your filters.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showQuickActions={
                  review.status === "awaiting_approval" || review.status === "pending"
                }
                onApprove={handleApprove}
                onReject={handleReject}
                onRegenerate={handleRegenerate}
              />
            ))}
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
