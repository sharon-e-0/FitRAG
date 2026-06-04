import { z } from "zod";
import { foodAnalysisResultSchema } from "@/lib/validation/food-analysis";

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
  eaten_at: z.string().datetime().optional(),
  analysis: foodAnalysisResultSchema
});

export const updateMealSchema = z.object({
  food_record_id: z.string().uuid(),
  food_name: z.string().trim().min(1).max(120),
  calories: z.coerce.number().nonnegative().max(10000),
  carbs: z.coerce.number().nonnegative().max(2000),
  protein: z.coerce.number().nonnegative().max(2000),
  fat: z.coerce.number().nonnegative().max(2000),
  sugar: z.coerce.number().nonnegative().max(2000),
  sodium: z.coerce.number().nonnegative().max(100000),
  emotion: mealEmotionSchema,
  context: mealContextSchema,
  memo: z.string().trim().max(1000).optional()
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
