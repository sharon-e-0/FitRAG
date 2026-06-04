"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get("config") === "missing_supabase_env"
      ? "Supabase environment variables are missing in this deployment."
      : null
  );

  async function signInWithGoogle() {
    try {
      setErrorMessage(null);
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/dashboard";
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
        }
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start Google login."
      );
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" className="w-full gap-2" onClick={signInWithGoogle}>
        <Chrome className="h-4 w-4" />
        Continue with Google
      </Button>
      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
