export type FoodAnalysisResult = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
  food_name: string;
  analysis_source?: "gemini" | "fallback";
  warning?: string;
};

export type FoodAnalysisRequest = {
  foodName?: string;
  image?: {
    mimeType: string;
    base64: string;
  };
};
