const initializeSupabase = async () => {
  const url = window.SUPABASE_URL;
  const publishableKey = window.SUPABASE_PUBLISHABLE_KEY;

  if (
    (url === undefined && publishableKey === undefined) ||
    (url === "" && publishableKey === "")
  ) return;
  if (typeof url !== "string" || typeof publishableKey !== "string") {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must both be configured.");
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" || !publishableKey.startsWith("sb_publishable_")) {
    throw new Error("Supabase requires an HTTPS URL and a publishable key.");
  }

  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm"
  );
  window.supabaseClient = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

initializeSupabase().catch((error) => {
  console.error("Unable to initialize the Supabase client.", error);
});
