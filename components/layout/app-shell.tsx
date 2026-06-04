import Link from "next/link";
import { Bot, LayoutDashboard, PlusCircle, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meals/new", label: "Meal", icon: PlusCircle },
  { href: "/coach", label: "Coach", icon: Bot },
  { href: "/profile", label: "Profile", icon: UserRound }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="border-b bg-background/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold">
            FitRAG
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Button key={item.href} variant="ghost" size="sm" asChild>
                <Link href={item.href} className="gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
