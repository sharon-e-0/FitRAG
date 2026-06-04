import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey() {
  const apiKey = normalizeGeminiApiKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

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

function normalizeGeminiApiKey(value: string | undefined) {
  if (!value) {
    return "";
  }

  const normalized = value.trim().replace(/^['"“”‘’]|['"“”‘’]$/g, "");
  const assignmentIndex = normalized.indexOf("=");

  if (assignmentIndex >= 0) {
    return normalizeGeminiApiKey(normalized.slice(assignmentIndex + 1));
  }

  return normalized.replace(/[“”‘’]/g, "");
}
