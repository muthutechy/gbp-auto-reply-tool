"use client";

/** Shared bootstrap cache — reset on sign-out / 401. */
export const authBootstrapState = {
  inflight: null as Promise<import("@/types").User | null> | null,
  userId: null as string | null,
};

export function resetAuthBootstrap() {
  authBootstrapState.inflight = null;
  authBootstrapState.userId = null;
}
