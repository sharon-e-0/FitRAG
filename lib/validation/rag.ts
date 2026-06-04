import { z } from "zod";

export const ragSourceTypeSchema = z.enum([
  "food_record",
  "food_analysis",
  "emotion",
  "situation",
  "health_connect",
  "weight_log",
  "weight_prediction",
  "chat_message",
  "summary"
]);

export const embedFoodRecordSchema = z.object({
  food_record_id: z.string().uuid()
});

export const ragSearchSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  match_count: z.number().int().min(1).max(20).optional(),
  threshold: z.number().min(0).max(1).optional(),
  source_type: ragSourceTypeSchema.optional()
});

export const healthCoachQuestionSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  session_id: z.string().uuid().optional(),
  top_k: z.number().int().min(1).max(20).optional(),
  threshold: z.number().min(0).max(1).optional(),
  source_type: ragSourceTypeSchema.optional(),
  include_prompt: z.boolean().optional()
});
