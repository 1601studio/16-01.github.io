const fs = require("node:fs");
const path = require("node:path");

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
let active = Boolean(url && publishableKey?.startsWith("sb_publishable_"));

if (active) {
  try {
    const parsedUrl = new URL(url);
    active = parsedUrl.protocol === "https:" &&
      !parsedUrl.username &&
      !parsedUrl.password &&
      !parsedUrl.search &&
      !parsedUrl.hash &&
      parsedUrl.pathname === "/";
  } catch {
    active = false;
  }
}

if (!active) {
  console.warn("Supabase runtime configuration is inactive; valid public variables were not provided.");
}

const runtimeConfig = [
  `window.SUPABASE_URL = ${JSON.stringify(active ? url : "")};`,
  `window.SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(active ? publishableKey : "")};`,
  ""
].join("\n");
const outputPath = path.join(__dirname, "..", "js", "supabase-runtime-config.js");

fs.writeFileSync(outputPath, runtimeConfig);
