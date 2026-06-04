import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { userProfileSchema } from "@/lib/validation/user-profile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id,user_id,age,gender,height_cm,target_weight_kg,created_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ profile: data ?? null });
  } catch (error) {
    console.error("[profile-get]", error);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = userProfileSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          age: body.age ?? null,
          gender: body.gender ?? "unknown",
          height_cm: body.height_cm ?? null,
          target_weight_kg: body.target_weight_kg ?? null
        },
        { onConflict: "user_id" }
      )
      .select("id,user_id,age,gender,height_cm,target_weight_kg,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ profile: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid profile input.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[profile-post]", error);
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
