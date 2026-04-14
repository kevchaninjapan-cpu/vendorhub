// app/dashboard/listings/page.tsx
import { redirect } from "next/navigation";

export default function DashboardListingsPage() {
  redirect("/admin/listings");
}