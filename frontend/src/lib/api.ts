import { getActiveTenantId, clearSession } from "./auth";
import { resetAuthBootstrap } from "./authBootstrapState";
import { supabase } from "./supabase";
import type {
  Analytics,
  AuditLog,
  AuthResponse,
  BulkApproveResult,
  Review,
  ReviewFilters,
  Tenant,
} from "@/types";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;

  if (process.env.NODE_ENV === "production") {
    const msg = "NEXT_PUBLIC_API_URL is not configured";
    if (typeof window !== "undefined") console.error("[api]", msg);
    throw new Error(msg);
  }

  if (typeof window !== "undefined") {
    console.error(
      "[api] NEXT_PUBLIC_API_URL is not set — using http://localhost:4000/api (development only)"
    );
  }
  return "http://localhost:4000/api";
}

function appendTenantParam(urlObj: URL) {
  const tenantId = getActiveTenantId();
  if (tenantId) urlObj.searchParams.set("tenant_id", tenantId);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const urlObj = new URL(`${getApiUrl()}${path}`);
  if (!path.startsWith("/auth")) appendTenantParam(urlObj);
  const url = urlObj.toString();

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      "Network or CORS error — cannot reach the API. Verify NEXT_PUBLIC_API_URL and backend FRONTEND_URL.",
      0
    );
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearSession();
    resetAuthBootstrap();
    await supabase.auth.signOut();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.replace("/login");
    }
    throw new ApiError(
      (data as { error?: string }).error || "Unauthorized — please sign in again",
      401
    );
  }

  if (res.status === 403) {
    throw new ApiError(
      (data as { error?: string }).error || "Forbidden — access denied",
      403
    );
  }

  if (res.status >= 500) {
    throw new ApiError(
      (data as { error?: string }).error || "Server error — please try again later",
      res.status
    );
  }

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || res.statusText,
      res.status
    );
  }

  return data as T;
}

export const api = {
  // Legacy endpoints (no longer used by Supabase login UI)
  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return request<{ user: AuthResponse["user"] }>("/auth/me");
  },

  getTenants() {
    return request<{ tenants: Tenant[] }>("/tenants");
  },

  getTenant(id: string) {
    return request<{ tenant: Tenant }>(`/tenants/${id}`);
  },

  updateTenant(id: string, data: Partial<Tenant>) {
    return request<{ tenant: Tenant }>(`/tenants/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  getReviews(local = true, filters: ReviewFilters = {}) {
    const params = new URLSearchParams();
    if (local) params.set("local", "true");
    if (filters.status) params.set("status", filters.status);
    if (filters.rating) params.set("rating", String(filters.rating));
    if (filters.sentiment) params.set("sentiment", filters.sentiment);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const qs = params.toString();
    return request<{ reviews: Review[]; source: string }>(`/reviews${qs ? `?${qs}` : ""}`);
  },

  getReviewsByStatus(status: string) {
    return api.getReviews(true, { status });
  },

  getAnalytics() {
    return request<{ analytics: Analytics }>("/analytics");
  },

  getGoogleStatus() {
    return request<{ connected: boolean; tenantId: string }>("/google/status");
  },

  getGoogleAuthUrl() {
    return request<{ url: string }>("/google/auth");
  },

  ensureTenant(payload?: Partial<Tenant>) {
    return request<{ tenant: Tenant }>("/tenants", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  getAuditLogs(limit = 100) {
    return request<{ logs: AuditLog[] }>(`/audit-logs?limit=${limit}`);
  },

  approveReview(id: string, reply: string) {
    return request<{ review: Review }>(`/reviews/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reply, final_reply: reply }),
    });
  },

  bulkApproveReviews(items: Array<{ id: string; reply: string }>) {
    return request<BulkApproveResult>("/reviews/bulk-approve", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  rejectReview(id: string) {
    return request<{ review: Review }>(`/reviews/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  regenerateReview(id: string) {
    return request<{ review: Review }>(`/reviews/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  updateReview(id: string, data: Partial<Review>) {
    return request<{ review: Review }>(`/reviews/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

export { ApiError };
