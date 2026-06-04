import { z } from "zod";

export const foodAnalysisJsonSchema = z.object({
  food_name: z.string().trim().min(1).max(120)
});

export const foodAnalysisResultSchema = z.object({
  calories: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  sugar: z.number().nonnegative(),
  sodium: z.number().nonnegative(),
  food_name: z.string().trim().min(1),
  analysis_source: z.enum(["gemini", "fallback", "user_edit"]).optional(),
  warning: z.string().trim().max(1000).optional()
});

export type FoodAnalysisJsonInput = z.infer<typeof foodAnalysisJsonSchema>;
