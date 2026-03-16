import { redirect } from "next/navigation";

export default function AuthCallback() {
  // With SSR + middleware, tokens are already handled server-side.
  // Bounce users where you want them post-auth:
  redirect("/dashboard");
}