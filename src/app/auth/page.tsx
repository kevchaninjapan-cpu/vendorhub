
import { redirect } from "next/navigation";

export default function AuthIndexPage() {
  // Immediately redirect /auth to /auth/sign-in
  redirect("/auth/sign-in");
}
