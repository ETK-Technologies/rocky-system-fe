import { toast } from "react-toastify";
import { logger } from "@/utils/devLogger";

/**
 * Attempt to login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {function} setLoading - Loading state setter
 * @returns {number} 1 if should continue, 0 if should stop
 */
export const TryLogin = async ({ email, password, setLoading }) => {
  try {
    setLoading(true);
    
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: email || "",
        password: password || "",
      }),
    });
    
    if (res.ok) {
      toast.success("Logged in successfully");
      return 1;
    } else {
      let data = null;
      try {
        data = await res.json();
      } catch (e) {}
      const msg = (data && (data.message || data.error)) || "Login failed";
      logger.log("Login failed:", msg);
      if (msg != "Login failed. Please try again.") {
        // Account exists, allow continuation
        return 1;
      }
    }
  } catch (e) {
    console.error(e);
    toast.error("Login failed. Please try again.");
    return 1;
  } finally {
    setLoading(false);
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const s = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

/**
 * Validate password (currently allows any password)
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid
 */
export const isValidPassword = (password) => {
  return true;
};
