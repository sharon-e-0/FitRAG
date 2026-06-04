import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { createMealSchema } from "@/lib/validation/meals";
import type { CreateMealInput } from "@/lib/validation/meals";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("food_records")
      .select(`
        id,
        user_id,
        input_type,
        meal_type,
        emotion,
        context,
        raw_text,
        image_url,
        memo,
        eaten_at,
        created_at,
        updated_at,
        food_analysis_results (
          id,
          food_name,
          calories,
          carbohydrate_g,
          protein_g,
          fat_g,
          sugar_g,
          sodium_mg,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("eaten_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ meals: data ?? [] });
  } catch (error) {
    console.error("[meals-get]", error);
    return NextResponse.json({ error: "Failed to fetch meals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { body, image } = await parseCreateMealRequest(request);
    const imageUrl = image ? await uploadMealImage(supabase, user.id, image) : null;
    const { data, error } = await supabase
      .from("food_records")
      .insert({
        user_id: user.id,
        input_type: body.input_type,
        meal_type: body.meal_type,
        emotion: body.emotion,
        context: body.context,
        raw_text: body.raw_text,
        image_url: imageUrl,
        memo: body.memo ?? null,
        eaten_at: body.eaten_at ?? new Date().toISOString()
      })
      .select("id,user_id,input_type,meal_type,emotion,context,raw_text,image_url,memo,eaten_at,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    if (body.analysis) {
      const { error: analysisError } = await supabase
        .from("food_analysis_results")
        .insert({
          food_record_id: data.id,
          user_id: user.id,
          food_name: body.analysis.food_name,
          analysis_source: body.analysis.analysis_source ?? "gemini",
          calories: body.analysis.calories,
          carbohydrate_g: body.analysis.carbs,
          protein_g: body.analysis.protein,
          fat_g: body.analysis.fat,
          sugar_g: body.analysis.sugar,
          sodium_mg: body.analysis.sodium,
          confidence_score: 0.8,
          raw_ai_response: body.analysis
        });

      if (analysisError) {
        throw analysisError;
      }
    }

    return NextResponse.json({ meal: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid meal input.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[meals-post]", error);
    return NextResponse.json({ error: "Failed to save meal." }, { status: 500 });
  }
}

async function parseCreateMealRequest(request: Request): Promise<{
  body: CreateMealInput;
  image?: File;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const analysisValue = formData.get("analysis");
    const analysis =
      typeof analysisValue === "string" && analysisValue
        ? JSON.parse(analysisValue)
        : undefined;
    const imageValue = formData.get("image");

    return {
      body: createMealSchema.parse({
        input_type: formData.get("input_type") ?? "text",
        meal_type: formData.get("meal_type") ?? "other",
        emotion: formData.get("emotion") ?? "normal",
        context: formData.get("context") ?? "normal_meal",
        raw_text: formData.get("raw_text") ?? "",
        memo: formData.get("memo") || undefined,
        eaten_at: formData.get("eaten_at") || undefined,
        analysis
      }),
      image: imageValue instanceof File && imageValue.size > 0 ? imageValue : undefined
    };
  }

  if (contentType.includes("application/json")) {
    return {
      body: createMealSchema.parse(await request.json())
    };
  }

  throw new Error("Unsupported content type.");
}

async function uploadMealImage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  image: File
) {
  const mimeType = getImageMimeType(image);

  if (!mimeType || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new Error("Unsupported meal image type.");
  }

  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  const { error } = await supabase.storage.from("meal_images").upload(path, buffer, {
    contentType: mimeType,
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("meal_images").getPublicUrl(path);

  return data.publicUrl;
}

function getImageMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  return "";
}
