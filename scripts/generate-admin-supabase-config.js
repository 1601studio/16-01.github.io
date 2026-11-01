const fs = require("node:fs");
const path = require("node:path");

const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;

function isLegacyAnonKey(key) {
  const segments = key.split(".");
  if (segments.length !== 3) return false;

  try {
    const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(decoded).role === "anon";
  } catch {
    return false;
  }
}

let active = Boolean(url && publicKey);
if (active) {
  try {
    const parsedUrl = new URL(url);
    active = parsedUrl.protocol === "https:" &&
      !parsedUrl.username &&
      !parsedUrl.password &&
      !parsedUrl.search &&
      !parsedUrl.hash &&
      parsedUrl.pathname === "/" &&
      (publicKey.startsWith("sb_publishable_") || isLegacyAnonKey(publicKey));
  } catch {
    active = false;
  }
}

if (!active) {
  console.warn("Admin Supabase configuration is inactive; valid public variables were not provided.");
}

const runtimeConfig = [
  `window.SUPABASE_URL = ${JSON.stringify(active ? url : "")};`,
  `window.SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(active ? publicKey : "")};`,
  ""
].join("\n");
const outputPath = path.join(__dirname, "..", "admin", "js", "supabase-runtime-config.js");

fs.writeFileSync(outputPath, runtimeConfig);
