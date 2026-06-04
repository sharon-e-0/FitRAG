import { createPartFromText } from "@google/genai";
import { GEMINI_MODEL, createGeminiClient } from "@/lib/ai/gemini";

export async function generateHealthCoachAnswer(prompt: string) {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [createPartFromText(prompt)],
    config: {
      temperature: 0.4
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty coach response.");
  }

  return {
    answer: response.text,
    model: GEMINI_MODEL,
    usageMetadata: response.usageMetadata
      ? JSON.parse(JSON.stringify(response.usageMetadata))
      : undefined
  };
}
