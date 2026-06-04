import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { analyzeFood } from "@/lib/ai/food-analysis";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { foodAnalysisJsonSchema } from "@/lib/validation/food-analysis";
import type { FoodAnalysisRequest } from "@/types/food-analysis";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = await parseRequest(request);

    if (!input.foodName && !input.image) {
      return NextResponse.json(
        { error: "Either image or food_name is required." },
        { status: 400 }
      );
    }

    const result = await analyzeFood(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request or Gemini response.", issues: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof RequestParseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[food-analyze]", error);

    return NextResponse.json({ error: getFoodAnalyzeErrorMessage(error) }, { status: 500 });
  }
}

async function parseRequest(request: NextRequest): Promise<FoodAnalysisRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartRequest(request);
  }

  if (contentType.includes("application/json")) {
    const body = foodAnalysisJsonSchema.parse(await request.json());
    return {
      foodName: body.food_name
    };
  }

  throw new RequestParseError("Unsupported content type.", 415);
}

async function parseMultipartRequest(request: NextRequest): Promise<FoodAnalysisRequest> {
  const formData = await request.formData();
  const foodNameValue = formData.get("food_name");
  const imageValue = formData.get("image");

  const foodName =
    typeof foodNameValue === "string" && foodNameValue.trim().length > 0
      ? foodNameValue.trim()
      : undefined;

  let image: FoodAnalysisRequest["image"];

  if (imageValue instanceof File && imageValue.size > 0) {
    const mimeType = getImageMimeType(imageValue);

    if (!mimeType || !SUPPORTED_IMAGE_TYPES.has(mimeType)) {
      throw new RequestParseError(
        "Unsupported image type. Use JPEG, PNG, WEBP, HEIC, or HEIF.",
        400
      );
    }

    if (imageValue.size > MAX_IMAGE_SIZE_BYTES) {
      throw new RequestParseError("Image file must be 12MB or smaller.", 400);
    }

    const buffer = Buffer.from(await imageValue.arrayBuffer());
    image = {
      mimeType,
      base64: buffer.toString("base64")
    };
  }

  if (foodName) {
    foodAnalysisJsonSchema.parse({ food_name: foodName });
  }

  return {
    foodName,
    image
  };
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

  if (extension === "heic") {
    return "image/heic";
  }

  if (extension === "heif") {
    return "image/heif";
  }

  return "";
}

function getFoodAnalyzeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("GOOGLE_GENERATIVE_AI_API_KEY")) {
    return "Gemini API key is not configured.";
  }

  if (/quota|rate limit|429/i.test(message)) {
    return "Gemini API rate limit or quota was exceeded.";
  }

  if (/invalid|unsupported|image|mime/i.test(message)) {
    return "Gemini could not analyze this image. Try a clearer JPEG, PNG, WEBP, HEIC, or HEIF image.";
  }

  return "Failed to analyze food with Gemini.";
}

class RequestParseError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}
