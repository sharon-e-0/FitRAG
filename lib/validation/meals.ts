import { z } from "zod";

export const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "late_night",
  "other"
]);

export const mealInputTypeSchema = z.enum(["image", "text", "image_text"]);

export const mealEmotionSchema = z.enum([
  "happy",
  "normal",
  "stress",
  "tired",
  "sad",
  "angry"
]);

export const mealContextSchema = z.enum([
  "normal_meal",
  "company_dinner",
  "late_night",
  "delivery",
  "home_meal",
  "rushed"
]);

export const createMealSchema = z.object({
  input_type: mealInputTypeSchema.default("text"),
  meal_type: mealTypeSchema.default("other"),
  emotion: mealEmotionSchema.default("normal"),
  context: mealContextSchema.default("normal_meal"),
  raw_text: z.string().trim().min(1, "Meal description is required.").max(2000),
  memo: z.string().trim().max(1000).optional(),
  eaten_at: z.string().datetime().optional()
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
