import { z } from "zod";

export const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "late_night",
  "other"
]);

export const createMealSchema = z.object({
  meal_type: mealTypeSchema.default("other"),
  raw_text: z.string().trim().min(1, "Meal description is required.").max(2000),
  memo: z.string().trim().max(1000).optional(),
  eaten_at: z.string().datetime().optional()
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
