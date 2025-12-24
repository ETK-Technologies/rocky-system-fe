import { redirect } from "next/navigation";

// Redirect to forgot-password if accessed without a token
export default function ResetPasswordPage() {
  redirect("/forgot-password");
}
