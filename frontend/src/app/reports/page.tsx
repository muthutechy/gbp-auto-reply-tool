"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { formatResponseTime } from "@/lib/format";
import type { Analytics } from "@/types";

const SENTIMENT_COLORS = ["#34d399", "#a1a1aa", "#fb7185"];

export default function ReportsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAnalytics()
      .then((res) => setAnalytics(res.analytics))
      .catch((err) => setError(err.message));
  }, []);

  const sentimentData = analytics?.sentimentBreakdown
    ? [
        { name: "Positive", value: analytics.sentimentBreakdown.positive },
        { name: "Neutral", value: analytics.sentimentBreakdown.neutral },
        { name: "Negative", value: analytics.sentimentBreakdown.negative },
      ].filter((d) => d.value > 0)
    : [];

  const keywordData = analytics?.keywordUsage
    ? Object.entries(analytics.keywordUsage).map(([name, count]) => ({ name, count }))
    : [];

  return (
    <AuthGuard>
      <DashboardLayout>
        <header>
          <h1 className="text-2xl font-semibold text-zinc-50">SEO Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Keyword rotation, sentiment, and response performance
          </p>
        </header>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total reviews" value={analytics?.totalReviews ?? "—"} />
          <StatCard
            label="Reply rate"
            value={analytics ? `${analytics.repliedPercent}%` : "—"}
          />
          <StatCard
            label="Avg response time"
            value={
              analytics
                ? analytics.avgResponseTimeLabel ||
                  formatResponseTime(
                    analytics.avgResponseTimeMinutes,
                    analytics.avgResponseTimeHours
                  )
                : "—"
            }
            hint="SEO signal"
          />
          <StatCard
            label="Keywords tracked"
            value={keywordData.length || "—"}
            hint="Rotated in replies"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Sentiment summary
            </h2>
            {sentimentData.length === 0 ? (
              <p className="mt-8 text-center text-sm text-zinc-500">No sentiment data yet</p>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {sentimentData.map((_, i) => (
                        <Cell key={i} fill={SENTIMENT_COLORS[i % SENTIMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Keyword usage
            </h2>
            {keywordData.length === 0 ? (
              <p className="mt-8 text-center text-sm text-zinc-500">No keyword usage yet</p>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={keywordData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis type="number" stroke="#71717a" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      stroke="#71717a"
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {analytics?.responseTimeSeoNote && (
          <p className="mt-6 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-5 py-4 text-sm text-emerald-200/90">
            {analytics.responseTimeSeoNote}
          </p>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
