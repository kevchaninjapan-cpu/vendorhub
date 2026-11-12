import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthHeader from "@/components/AuthHeader";
import { getUnreadMessageCount } from "@/lib/messages/queries";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in -> send to landing page
  if (!user) redirect("/");

  const unreadMessages = await getUnreadMessageCount();

  return (
    <>
      <AuthHeader unreadMessages={unreadMessages} />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </>
  );
}