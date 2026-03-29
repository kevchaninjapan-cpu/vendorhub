// app/admin/listings/[id]/page.tsx
import { redirect } from "next/navigation";
import { requireAdminAuth } from '@/lib/guards'
import ImageUploader from "./ImageUploader";
import ImageGallery from "./ImageGallery";
import { createServerClient } from '@/lib/supabase/server'



const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) redirect('/login')

export const dynamic = "force-dynamic";

export default async function AdminListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminAuth();
  const { id: listingId } = await params;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Listing</h1>
        <p className="text-sm text-muted-foreground">Listing ID: {listingId}</p>
      </div>

      <ImageUploader listingId={listingId} />

      {/* ✅ Gallery list */}
      <ImageGallery listingId={listingId} />
    </div>
  );
}