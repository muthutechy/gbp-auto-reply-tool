"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StarRating } from "@/components/StarRating";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { actionLabel, replyFromValue } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import type { AuditLog } from "@/types";

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "approve_review", label: "Approved" },
  { value: "reject_review", label: "Rejected" },
  { value: "auto_reply", label: "Auto reply" },
  { value: "edit_reply", label: "Edited reply" },
  { value: "regenerate_reply", label: "Regenerated" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAuditLogs(200)
      .then((res) => setLogs(res.logs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <DashboardLayout>
        <PageHeader
          title="Audit logs"
          description="Track approvals, rejections, auto replies, and manual edits"
        >
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </PageHeader>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        {loading ? (
          <p className="mt-8 text-zinc-500">Loading audit logs…</p>
        ) : logs.filter((l) => !actionFilter || l.action === actionFilter).length === 0 ? (
          <p className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center text-zinc-500">
            {logs.length === 0
              ? "No audit activity yet."
              : "No logs match this action filter."}
          </p>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Review</th>
                    <th className="px-4 py-3 font-medium">Old → New reply</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs
                    .filter((l) => !actionFilter || l.action === actionFilter)
                    .map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-zinc-800/80 transition hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {log.user_email || (log.action === "auto_reply" ? "System" : "—")}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        {log.review_snippet ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <StarRating rating={log.review_snippet.rating} size="sm" />
                              <span className="text-xs text-zinc-500">
                                {log.review_snippet.reviewer_name || "Anonymous"}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                              {log.review_snippet.comment || "(No comment)"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p className="line-clamp-2 text-xs text-zinc-500">
                          {replyFromValue(log.old_value)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-emerald-200/90">
                          → {replyFromValue(log.new_value)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
