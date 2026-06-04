"use client";

import { useSearchParams } from "next/navigation";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const searchParams = useSearchParams();

  async function signInWithGoogle() {
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/dashboard";
    const origin = window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
  }

  return (
    <Button type="button" className="w-full gap-2" onClick={signInWithGoogle}>
      <Chrome className="h-4 w-4" />
      Continue with Google
    </Button>
  );
}
