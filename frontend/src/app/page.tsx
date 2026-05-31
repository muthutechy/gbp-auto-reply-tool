"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      router.replace(data.user ? "/dashboard" : "/login");
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
      Redirecting…
    </div>
  );
}
