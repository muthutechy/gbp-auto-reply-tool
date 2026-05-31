"use client";

import type { User } from "@/types";

const USER_KEY = "gbp_user";
const TENANT_KEY = "tenant_id";

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem("gbp_active_tenant");
}

/** Active tenant for API calls (admin can switch; clients use their own). */
export function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(TENANT_KEY) || localStorage.getItem("gbp_active_tenant")
  );
}

export function setActiveTenantId(tenantId: string | null) {
  if (typeof window === "undefined") return;
  if (tenantId) {
    localStorage.setItem(TENANT_KEY, tenantId);
    localStorage.setItem("gbp_active_tenant", tenantId);
  } else {
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem("gbp_active_tenant");
  }
}
