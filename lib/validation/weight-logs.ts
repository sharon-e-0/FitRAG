import { z } from "zod";

export const weightLogDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

export const createWeightLogSchema = z.object({
  weight_kg: z.coerce.number().positive().max(500),
  logged_date: weightLogDateSchema.optional(),
  memo: z.string().trim().max(1000).optional()
});

export type CreateWeightLogInput = z.infer<typeof createWeightLogSchema>;
