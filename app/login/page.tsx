import Link from "next/link";
import { Suspense } from "react";
import { LoginButton } from "@/components/auth/login-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="text-sm font-medium text-primary">
            FitRAG
          </Link>
          <CardTitle className="text-2xl">Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Sign in with Google to sync your personal meal, emotion, activity,
            and coaching records.
          </p>
          <Suspense fallback={null}>
            <LoginButton />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
