import { AppShell } from "@/components/layout/app-shell";
import { MealForm } from "@/components/meals/meal-form";

export default function NewMealPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">New meal</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a meal image or write a meal log, then analyze and save it.
        </p>
        <div className="mt-6">
          <MealForm />
        </div>
      </div>
    </AppShell>
  );
}
