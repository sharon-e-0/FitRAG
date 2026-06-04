import type { SupabaseClient, User } from "@supabase/supabase-js";

type AuthResult = {
  user: User | null;
  error: Error | null;
};

export async function getAuthenticatedUser(
  supabase: SupabaseClient,
  request?: Request
): Promise<AuthResult> {
  const bearerToken = getBearerToken(request);
  const {
    data: { user },
    error
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  return {
    user,
    error
  };
}

function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  return scheme.toLowerCase() === "bearer" && token ? token : null;
}
