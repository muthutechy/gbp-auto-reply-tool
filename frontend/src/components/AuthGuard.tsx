"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bootstrapAuthSession } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";

type GuardState = "loading" | "ready" | "init_failed";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("loading");

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const profile = await bootstrapAuthSession();
      if (!mounted) return;

      if (!profile) {
        setState("init_failed");
        return;
      }

      setState("ready");
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  if (state === "init_failed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center">
        <p className="text-lg font-medium text-zinc-100">Unable to initialize account</p>
        <p className="max-w-sm text-sm text-zinc-500">
          We could not set up your profile. Please try signing in again.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
