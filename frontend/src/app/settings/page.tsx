"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { getActiveTenantId, getUser } from "@/lib/auth";
import type { Tenant } from "@/types";

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [tone, setTone] = useState("friendly");
  const [autoReply, setAutoReply] = useState(true);

  useEffect(() => {
    const tenantId = getActiveTenantId() || getUser()?.tenant_id;
    if (!tenantId) {
      setError("No tenant selected. Sign in again or pick a tenant (admin).");
      setLoading(false);
      return;
    }

    api
      .getTenant(tenantId)
      .then((res) => {
        const t = res.tenant;
        setTenant(t);
        setBusinessName(t.business_name);
        setLocation(t.location || "");
        setPrimaryKeyword(t.primary_keyword);
        setSecondaryKeywords((t.secondary_keywords || []).join(", "));
        setTone(t.tone);
        setAutoReply(t.auto_reply_enabled !== false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const secondary = secondaryKeywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.updateTenant(tenant.id, {
        business_name: businessName,
        location: location || null,
        primary_keyword: primaryKeyword,
        secondary_keywords: secondary,
        tone,
        auto_reply_enabled: autoReply,
      });
      setTenant(res.tenant);
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <header>
          <h1 className="text-2xl font-semibold text-zinc-50">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Business profile, SEO keywords, tone, and automation
          </p>
        </header>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}
        {message && (
          <p className="mt-4 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-zinc-500">Loading settings…</p>
        ) : (
          <form
            onSubmit={handleSave}
            className="mt-8 max-w-xl space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg"
          >
            <label className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
              <div>
                <p className="font-medium text-zinc-200">Auto reply</p>
                <p className="text-xs text-zinc-500">Automatically post replies for eligible reviews</p>
              </div>
              <input
                type="checkbox"
                checked={autoReply}
                onChange={(e) => setAutoReply(e.target.checked)}
                className="h-5 w-5 rounded border-zinc-600 text-emerald-600"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Business name
              </span>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Location
              </span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Primary keyword
              </span>
              <input
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Secondary keywords (comma-separated)
              </span>
              <input
                value={secondaryKeywords}
                onChange={(e) => setSecondaryKeywords(e.target.value)}
                placeholder="plumber, emergency repair"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tone</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
