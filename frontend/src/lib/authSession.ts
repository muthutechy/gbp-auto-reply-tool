"use client";

import { api } from "./api";
import { authBootstrapState, resetAuthBootstrap } from "./authBootstrapState";
import { getUser, setActiveTenantId, setUser } from "./auth";
import { supabase } from "./supabase";
import type { User } from "@/types";

export { resetAuthBootstrap };

/** Sync Supabase user → local profile + ensure backend tenant exists. Never redirects. */
export async function bootstrapAuthSession(): Promise<User | null> {
  if (authBootstrapState.inflight) return authBootstrapState.inflight;

  authBootstrapState.inflight = (async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const userId = data.user.id;

    if (authBootstrapState.userId === userId) {
      const cached = getUser();
      if (cached?.id === userId) return cached;
    }

    const existing = getUser();
    if (existing?.id === userId && existing.tenant_id) {
      setActiveTenantId(existing.tenant_id);
      authBootstrapState.userId = userId;
      return existing;
    }

    const profile: User = {
      id: userId,
      email: data.user.email || "",
      role: "client",
      tenant_id: existing?.tenant_id ?? null,
    };

    setUser(profile);

    if (profile.tenant_id) {
      setActiveTenantId(profile.tenant_id);
      authBootstrapState.userId = userId;
      return profile;
    }

    try {
      const res = await api.ensureTenant({
        business_name: profile.email.split("@")[0] || "My Business",
      });
      profile.tenant_id = res.tenant.id;
      setActiveTenantId(res.tenant.id);
      setUser(profile);
      authBootstrapState.userId = userId;
      return profile;
    } catch {
      authBootstrapState.userId = userId;
      return profile;
    }
  })();

  try {
    return await authBootstrapState.inflight;
  } finally {
    authBootstrapState.inflight = null;
  }
}
