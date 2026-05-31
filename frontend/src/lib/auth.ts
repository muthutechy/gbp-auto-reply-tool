import type { User } from "@/types";

const TOKEN_KEY = "gbp_token";
const USER_KEY = "gbp_user";
const TENANT_KEY = "gbp_active_tenant";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

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

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

/** Active tenant for API calls (admin can switch; clients use their own). */
export function getActiveTenantId(): string | null {
  const user = getUser();
  if (!user) return null;
  if (user.role === "admin" && typeof window !== "undefined") {
    return localStorage.getItem(TENANT_KEY) || user.tenant_id;
  }
  return user.tenant_id;
}

export function setActiveTenantId(tenantId: string | null) {
  if (typeof window === "undefined") return;
  if (tenantId) localStorage.setItem(TENANT_KEY, tenantId);
  else localStorage.removeItem(TENANT_KEY);
}
