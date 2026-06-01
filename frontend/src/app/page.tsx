"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function route() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      router.replace(data.session ? "/dashboard" : "/login");
    }

    route();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
      Redirecting…
    </div>
  );
}
