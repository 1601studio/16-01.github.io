import { getSupabaseClient } from "./supabase-config.js";

const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const loginButton = document.querySelector("#login-button");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector("#toggle-password");

function setMessage(text) {
  message.textContent = text;
}

function getStatusMessage() {
  const status = new URLSearchParams(window.location.search).get("status");
  const messages = {
    unauthorized: "This account does not have active Admin access.",
    expired: "Your session expired. Please sign in again."
  };
  return messages[status] || "";
}

async function verifyAdmin(client) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return { authorized: false, reason: "session" };
  }

  const { data: staff, error: staffError } = await client
    .from("studio_staff")
    .select("role, is_active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (staffError) {
    throw new Error("Unable to verify studio staff access.", { cause: staffError });
  }

  if (!staff || staff.is_active !== true || staff.role !== "admin") {
    return { authorized: false, reason: "unauthorized" };
  }

  return { authorized: true, user: userData.user, role: staff.role };
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.classList.toggle("is-loading", isLoading);
}

if (form) {
  setMessage(getStatusMessage());

  passwordToggle.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    passwordToggle.textContent = isVisible ? "Show" : "Hide";
    passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  });

  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error("Unable to check the current sign-in session.", { cause: error });

    if (data.session) {
      const access = await verifyAdmin(client);
      if (access.authorized) {
        window.location.replace("dashboard.html");
      } else if (access.reason === "unauthorized") {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) console.error("Unable to end unauthorized session.", signOutError);
        setMessage("This account does not have active Admin access.");
      } else {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) console.error("Unable to clear expired session.", signOutError);
        setMessage("Your session expired. Please sign in again.");
      }
    }
  } catch (error) {
    console.error("Admin login initialization failed.", error);
    setMessage(error.message || "Admin sign-in could not be initialized.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const client = await getSupabaseClient();
      const email = new FormData(form).get("email");
      const password = new FormData(form).get("password");
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error("Admin sign-in failed.", signInError);
        setMessage(
          signInError.message === "Invalid login credentials"
            ? "The email or password is incorrect."
            : "Unable to sign in. Check your details and try again."
        );
        return;
      }

      const access = await verifyAdmin(client);
      if (!access.authorized) {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) console.error("Unable to end unauthorized session.", signOutError);
        setMessage(
          access.reason === "unauthorized"
            ? "This account does not have active Admin access."
            : "Your session could not be verified. Please sign in again."
        );
        return;
      }

      window.location.replace("dashboard.html");
    } catch (error) {
      console.error("Admin sign-in could not be completed.", error);
      setMessage(error.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  });
}

export { verifyAdmin };
