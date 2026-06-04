import { z } from "zod";

export const userProfileSchema = z.object({
  age: z.coerce.number().int().positive().max(129).optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  height_cm: z.coerce.number().positive().max(300).optional(),
  target_weight_kg: z.coerce.number().positive().max(500).optional()
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
