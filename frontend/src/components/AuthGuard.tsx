"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bootstrapAuthSession } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }

      await bootstrapAuthSession();
      if (!mounted) return;
      setReady(true);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/login");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
