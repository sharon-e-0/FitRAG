import { AppShell } from "@/components/layout/app-shell";
import { MealForm } from "@/components/meals/meal-form";

export default function NewMealPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">New meal</h1>
        <p className="mt-2 text-muted-foreground">
          Save a text meal log now; image analysis can attach to the same record later.
        </p>
        <div className="mt-6">
          <MealForm />
        </div>
      </div>
    </AppShell>
  );
}
