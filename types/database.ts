export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type MealInputType = "image" | "text" | "image_text";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "late_night" | "other";
export type MealEmotion = "happy" | "normal" | "stress" | "tired" | "sad" | "angry";
export type MealContext =
  | "normal_meal"
  | "company_dinner"
  | "late_night"
  | "delivery"
  | "home_meal"
  | "rushed";

export type FoodRecord = {
  id: string;
  user_id: string;
  input_type: MealInputType;
  meal_type: MealType | null;
  emotion: MealEmotion | null;
  context: MealContext | null;
  raw_text: string | null;
  image_url: string | null;
  memo: string | null;
  eaten_at: string;
  created_at: string;
  updated_at: string;
};
