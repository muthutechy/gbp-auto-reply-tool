"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { formatResponseTime } from "@/lib/format";
import type { Analytics } from "@/types";

const SENTIMENT_COLORS = ["#34d399", "#a1a1aa", "#fb7185"];

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAnalytics()
      .then((res) => setAnalytics(res.analytics))
      .catch((err) => setError(err.message));

    api
      .getGoogleStatus()
      .then((res) => setGoogleConnected(res.connected))
      .catch(() => setGoogleConnected(false));
  }, []);

  async function handleConnectGoogle() {
    setConnectingGoogle(true);
    try {
      const { url } = await api.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Google connect");
      setConnectingGoogle(false);
    }
  }

  const sentimentData = analytics?.sentimentBreakdown
    ? [
        { name: "Positive", value: analytics.sentimentBreakdown.positive },
        { name: "Neutral", value: analytics.sentimentBreakdown.neutral },
        { name: "Negative", value: analytics.sentimentBreakdown.negative },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <AuthGuard>
      <DashboardLayout>
        <header>
          <h1 className="text-2xl font-semibold text-zinc-50">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            AI-powered review automation & SEO performance
          </p>
        </header>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm font-medium text-zinc-200">Google Business Profile</p>
            <p className="text-xs text-zinc-500">Sync reviews and post replies to Google</p>
          </div>
          {googleConnected === null ? (
            <span className="text-xs text-zinc-500">Checking connection…</span>
          ) : googleConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              Google Connected ✓
            </span>
          ) : (
            <button
              type="button"
              disabled={connectingGoogle}
              onClick={handleConnectGoogle}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {connectingGoogle ? "Redirecting…" : "Connect Google"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total reviews" value={analytics?.totalReviews ?? "—"} />
          <StatCard
            label="Reply rate"
            value={analytics ? `${analytics.repliedPercent}%` : "—"}
            hint={analytics ? `${analytics.repliedCount} replied` : undefined}
          />
          <StatCard
            label="Needs approval"
            value={analytics?.pendingApprovals ?? "—"}
            hint="Action required"
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
            hint="SEO ranking signal"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg transition hover:border-zinc-700">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Sentiment breakdown
            </h2>
            {sentimentData.length === 0 ? (
              <p className="mt-8 text-center text-sm text-zinc-500">No data yet</p>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
            <div className="mt-2 flex justify-center gap-4 text-xs text-zinc-500">
              {sentimentData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: SENTIMENT_COLORS[i % SENTIMENT_COLORS.length] }}
                  />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Quick stats
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between rounded-lg border border-zinc-800 px-4 py-3">
                <span className="text-zinc-400">Pending processing</span>
                <span className="font-medium text-amber-300">
                  {analytics?.pendingProcessing ?? "—"}
                </span>
              </li>
              <li className="flex justify-between rounded-lg border border-zinc-800 px-4 py-3">
                <span className="text-zinc-400">Awaiting approval</span>
                <span className="font-medium text-orange-300">
                  {analytics?.pendingApprovals ?? "—"}
                </span>
              </li>
              <li className="flex justify-between rounded-lg border border-zinc-800 px-4 py-3">
                <span className="text-zinc-400">Keywords in rotation</span>
                <span className="font-medium text-emerald-300">
                  {analytics?.keywordUsage
                    ? Object.keys(analytics.keywordUsage).length
                    : "—"}
                </span>
              </li>
            </ul>
            <Link
              href="/reports"
              className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:underline"
            >
              View full SEO reports →
            </Link>
          </div>
        </div>

        {analytics?.responseTimeSeoNote && (
          <p className="mt-6 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-5 py-4 text-sm text-emerald-200/90">
            {analytics.responseTimeSeoNote}
            {analytics.avgResponseTimeLabel && (
              <span className="mt-1 block font-medium text-emerald-300">
                Your average: {analytics.avgResponseTimeLabel}
              </span>
            )}
          </p>
        )}

        {analytics && analytics.pendingApprovals > 0 && (
          <div className="mt-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-5 shadow-sm">
            <p className="font-medium text-orange-200">
              {analytics.pendingApprovals} review
              {analytics.pendingApprovals !== 1 ? "s" : ""} awaiting approval
            </p>
            <Link
              href="/approvals"
              className="mt-2 inline-block text-sm font-medium text-orange-300 hover:underline"
            >
              Go to approvals →
            </Link>
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
