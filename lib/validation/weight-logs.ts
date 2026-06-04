import { z } from "zod";

export const weightLogDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

export const createWeightLogSchema = z.object({
  weight_kg: z.coerce.number().positive().max(500).optional(),
  active_calories: z.coerce.number().nonnegative().max(5000).optional(),
  logged_date: weightLogDateSchema.optional(),
  memo: z.string().trim().max(1000).optional()
}).refine(
  (value) => value.weight_kg !== undefined || value.active_calories !== undefined,
  "Either weight_kg or active_calories is required."
);

export type CreateWeightLogInput = z.infer<typeof createWeightLogSchema>;
