"use client";

import { api } from "./api";
import { setActiveTenantId, setUser } from "./auth";
import { supabase } from "./supabase";
import type { User } from "@/types";

/** Sync Supabase user → local profile + ensure backend tenant exists. */
export async function bootstrapAuthSession(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const profile: User = {
    id: data.user.id,
    email: data.user.email || "",
    role: "client",
    tenant_id: null,
  };

  setUser(profile);

  try {
    const res = await api.ensureTenant({
      business_name: profile.email.split("@")[0] || "My Business",
    });
    profile.tenant_id = res.tenant.id;
    setActiveTenantId(res.tenant.id);
    setUser(profile);
    return profile;
  } catch {
    return profile;
  }
}
