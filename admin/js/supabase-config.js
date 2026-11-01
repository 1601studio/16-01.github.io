const SUPABASE_SDK_URL =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";

let clientPromise;

function isLegacyAnonKey(key) {
  const segments = key.split(".");
  if (segments.length !== 3) return false;

  try {
    const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
    return JSON.parse(decoded).role === "anon";
  } catch {
    return false;
  }
}

function readPublicConfig() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_PUBLISHABLE_KEY;

  if (typeof url !== "string" || !url || typeof key !== "string" || !key) {
    throw new Error(
      "Admin sign-in is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY; see the Admin CMS setup in README.md."
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("The configured Supabase project URL is invalid.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.pathname !== "/"
  ) {
    throw new Error("The Supabase project URL must be a plain HTTPS project URL.");
  }

  if (!key.startsWith("sb_publishable_") && !isLegacyAnonKey(key)) {
    throw new Error("Use a Supabase publishable key or legacy anon key. Never use a secret or service-role key.");
  }

  return { url, key };
}

export async function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { url, key } = readPublicConfig();
      const { createClient } = await import(SUPABASE_SDK_URL);
      return createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    })();
  }

  return clientPromise;
}
