import { redirect } from "next/navigation";

// Enquiries now live in the messages inbox. Kept so old email links work.
export default function EnquiriesPage() {
  redirect("/account/messages");
}