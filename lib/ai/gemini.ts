import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  return apiKey;
}

export function createGeminiClient() {
  return new GoogleGenAI({
    apiKey: getGeminiApiKey()
  });
}
