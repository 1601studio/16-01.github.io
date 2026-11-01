import { getSupabaseClient } from "./supabase-config.js";
import { verifyAdmin } from "./auth.js";

const app = document.querySelector("#dashboard-app");
const loading = document.querySelector("#dashboard-loading");
const message = document.querySelector("#dashboard-message");
const logoutButton = document.querySelector("#logout-button");

function redirectToLogin(status) {
  window.location.replace(`login.html?status=${encodeURIComponent(status)}`);
}

async function startDashboard() {
  const client = await getSupabaseClient();
  const access = await verifyAdmin(client);

  if (!access.authorized) {
    redirectToLogin(access.reason === "unauthorized" ? "unauthorized" : "expired");
    return;
  }

  document.querySelector("#admin-email").textContent = access.user.email || "Studio admin";
  document.querySelector("#admin-role").textContent = access.role;
  loading.hidden = true;
  app.hidden = false;

  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") redirectToLogin("expired");
  });
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  message.textContent = "";

  try {
    const client = await getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error("Unable to sign out. Please try again.", { cause: error });
    redirectToLogin("");
  } catch (error) {
    console.error("Admin sign-out failed.", error);
    message.textContent = error.message || "Unable to sign out. Please try again.";
    logoutButton.disabled = false;
  }
});

try {
  await startDashboard();
} catch (error) {
  console.error("Admin dashboard access check failed.", error);
  redirectToLogin("expired");
}
