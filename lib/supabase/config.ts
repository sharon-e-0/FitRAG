export function getSupabaseConfig() {
  return {
    url: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  };
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const normalized = value.trim().replace(/^['"“”‘’]|['"“”‘’]$/g, "");
  const assignmentIndex = normalized.indexOf("=");

  if (assignmentIndex >= 0) {
    return normalizeEnvValue(normalized.slice(assignmentIndex + 1));
  }

  try {
    const url = new URL(normalized.replace(/[“”‘’]/g, ""));

    if (url.hostname.endsWith(".supabase.co")) {
      return url.origin;
    }
  } catch {
    return normalized;
  }

  return normalized;
}
