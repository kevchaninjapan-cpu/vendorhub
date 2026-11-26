import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { PublicListingDocument } from "./schema";

// The document list a buyer (or signed-out visitor) sees on a listing page.
// Read with the server-only key and filtered here, because the database no
// longer lets signed-in users read other people's documents directly.
//
// Rules: live or under-offer listings only, never private documents, and the
// columns are listed explicitly so file paths and uploaders are never sent.

export async function fetchPublicDocuments(listingId: string): Promise<PublicListingDocument[]> {
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return [];

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: live } = await db
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .in("status", ["live", "under_offer"])
    .maybeSingle();
  if (!live) return [];

  const { data, error } = await db
    .from("listing_documents")
    .select("id, listing_id, doc_type, visibility, file_name, file_size, mime_type, label, created_at, updated_at")
    .eq("listing_id", listingId)
    .neq("visibility", "private")
    .order("doc_type");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicListingDocument[];
}