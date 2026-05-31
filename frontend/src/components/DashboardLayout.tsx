"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getUser, getActiveTenantId, setActiveTenantId } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Tenant } from "@/types";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reviews", label: "Reviews" },
  { href: "/approvals", label: "Approvals" },
  { href: "/reports", label: "Reports" },
  { href: "/audit-logs", label: "Audit logs" },
  { href: "/settings", label: "Settings" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>("");

  useEffect(() => {
    const tid = getActiveTenantId();
    if (tid) setActiveTenant(tid);

    if (user?.role === "admin") {
      api
        .getTenants()
        .then((res) => {
          setTenants(res.tenants);
          if (res.tenants.length > 0 && !getActiveTenantId()) {
            setActiveTenantId(res.tenants[0].id);
            setActiveTenant(res.tenants[0].id);
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  function handleTenantChange(tenantId: string) {
    setActiveTenant(tenantId);
    setActiveTenantId(tenantId);
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-60 flex-col border-r border-zinc-800 bg-zinc-900/90 p-4 shadow-xl">
        <div className="mb-8 px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            GBP SEO
          </p>
          <h1 className="text-lg font-bold text-zinc-50">Auto Reply</h1>
          <p className="mt-0.5 text-xs text-zinc-500">SaaS Dashboard</p>
        </div>

        {user?.role === "admin" && tenants.length > 0 && (
          <div className="mb-4 px-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tenant
            </label>
            <select
              value={activeTenant}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.business_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition hover:shadow-sm ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300 shadow-emerald-500/5"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-sm font-semibold text-emerald-300"
              aria-hidden
            >
              {(user?.email?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{user?.email}</p>
              <p className="mt-0.5 text-xs capitalize text-zinc-500">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-zinc-950 p-8">{children}</main>
    </div>
  );
}
