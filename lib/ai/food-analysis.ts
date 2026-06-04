import { Type, createPartFromBase64, createPartFromText } from "@google/genai";
import { GEMINI_MODEL, createGeminiClient } from "@/lib/ai/gemini";
import { foodAnalysisResultSchema } from "@/lib/validation/food-analysis";
import type { FoodAnalysisRequest, FoodAnalysisResult } from "@/types/food-analysis";

export async function analyzeFood(input: FoodAnalysisRequest): Promise<FoodAnalysisResult> {
  const ai = createGeminiClient();
  const contents = [
    createPartFromText(buildFoodAnalysisPrompt(input.foodName)),
    ...(input.image ? [createPartFromBase64(input.image.base64, input.image.mimeType)] : [])
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories: {
            type: Type.NUMBER,
            description: "Estimated calories in kcal."
          },
          carbs: {
            type: Type.NUMBER,
            description: "Estimated carbohydrates in grams."
          },
          protein: {
            type: Type.NUMBER,
            description: "Estimated protein in grams."
          },
          fat: {
            type: Type.NUMBER,
            description: "Estimated fat in grams."
          },
          sugar: {
            type: Type.NUMBER,
            description: "Estimated sugar in grams."
          },
          sodium: {
            type: Type.NUMBER,
            description: "Estimated sodium in milligrams."
          },
          food_name: {
            type: Type.STRING,
            description: "Detected or normalized food name."
          }
        },
        required: ["calories", "carbs", "protein", "fat", "sugar", "sodium", "food_name"]
      }
    }
  });

  const parsedJson = parseGeminiJson(response.text);
  return foodAnalysisResultSchema.parse(parsedJson);
}

function buildFoodAnalysisPrompt(foodName?: string) {
  const foodNameInstruction = foodName
    ? `The user provided this food name or description: "${foodName}".`
    : "The user did not provide a food name. Infer it from the image.";

  return `
Analyze the meal for a health tracking app.

${foodNameInstruction}

Return only JSON with this exact shape:
{
  "calories": number,
  "carbs": number,
  "protein": number,
  "fat": number,
  "sugar": number,
  "sodium": number,
  "food_name": string
}

Units:
- calories: kcal
- carbs, protein, fat, sugar: grams
- sodium: milligrams

If the portion size is uncertain, provide a reasonable single-serving estimate.
Do not include markdown, commentary, or extra keys.
`.trim();
}

function parseGeminiJson(text: string | undefined) {
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Gemini response was not valid JSON.");
    }

    return JSON.parse(match[0]);
  }
}
