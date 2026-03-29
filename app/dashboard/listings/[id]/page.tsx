// app/admin/listings/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Allowed listing_status transitions
const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  draft: new Set(["active", "archived"]),
  active: new Set(["under_offer", "sold", "archived"]),
  under_offer: new Set(["sold", "archived"]),
  sold: new Set(["archived"]),
  archived: new Set(["draft"]),
};

function canTransition(from: string, to: string) {
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
}

export default async function AdminListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const supabase = await createServerClient();

  // Auth is gated by app/admin/layout.tsx, but keeping this here is safe
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) console.error("[ADMIN_LISTING_DETAIL_AUTH_ERROR]", authErr);
  if (!authData?.user) redirect("/login");

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[ADMIN_LISTING_DETAIL_QUERY_ERROR]", error);
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Admin · Listing</h1>
        <p className="mt-2 text-red-600">Unable to load listing.</p>
      </div>
    );
  }

  if (!listing) notFound();

  const { data: images, error: imgErr } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path, created_at")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  if (imgErr) console.error("[ADMIN_LISTING_IMAGES_QUERY_ERROR]", imgErr);

  // Public URL helper for listing-photos bucket
  const bucket = supabase.storage.from("listing-photos");
  const imageRows =
    images?.map((img) => {
      const { data } = bucket.getPublicUrl(img.storage_path);
      return { ...img, publicUrl: data.publicUrl };
    }) ?? [];

  // -----------------------
  // Server Actions
  // -----------------------
  async function updateStatusAction(formData: FormData) {
    "use server";

    const nextStatus = String(formData.get("next_status") ?? "").trim();

    const supabase = await createServerClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) redirect("/login");

    const { data: current, error } = await supabase
      .from("listings")
      .select("id, status")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[ADMIN_STATUS_READ_ERROR]", error);
      throw new Error("Unable to read listing status");
    }

    const from = String(current.status ?? "");
    if (!canTransition(from, nextStatus)) {
      throw new Error(`Invalid status transition: ${from} → ${nextStatus}`);
    }

    const { error: updErr } = await supabase
      .from("listings")
      .update({ status: nextStatus })
      .eq("id", id);

    if (updErr) {
      console.error("[ADMIN_STATUS_UPDATE_ERROR]", updErr);
      throw new Error("Unable to update status");
    }

    redirect(`/admin/listings/${id}`);
  }

  async function archiveAction() {
    "use server";

    const supabase = await createServerClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) redirect("/login");

    const { data: current, error } = await supabase
      .from("listings")
      .select("id, status")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[ADMIN_ARCHIVE_READ_ERROR]", error);
      throw new Error("Unable to read listing");
    }

    const from = String(current.status ?? "");
    if (!canTransition(from, "archived")) {
      throw new Error(`Invalid status transition: ${from} → archived`);
    }

    const { error: updErr } = await supabase
      .from("listings")
      .update({ status: "archived" })
      .eq("id", id);

    if (updErr) {
      console.error("[ADMIN_ARCHIVE_UPDATE_ERROR]", updErr);
      throw new Error("Unable to archive listing");
    }

    redirect(`/admin/listings/${id}`);
  }

  async function restoreToDraftAction() {
    "use server";

    const supabase = await createServerClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) redirect("/login");

    const { data: current, error } = await supabase
      .from("listings")
      .select("id, status")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[ADMIN_RESTORE_READ_ERROR]", error);
      throw new Error("Unable to read listing");
    }

    const from = String(current.status ?? "");
    if (!canTransition(from, "draft")) {
      throw new Error(`Invalid status transition: ${from} → draft`);
    }

    const { error: updErr } = await supabase
      .from("listings")
      .update({ status: "draft" })
      .eq("id", id);

    if (updErr) {
      console.error("[ADMIN_RESTORE_UPDATE_ERROR]", updErr);
      throw new Error("Unable to restore listing");
    }

    redirect(`/admin/listings/${id}`);
  }

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold">{listing.title ?? "(Untitled)"}</h1>
          <div className="mt-1 text-sm text-gray-600">{listing.id}</div>
          <div className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
            {String(listing.status ?? "—")}
          </div>
        </div>

        <div className="flex gap-2">
          <form action={archiveAction}>
            <SubmitButton className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              Archive
            </SubmitButton>
          </form>

          <form action={restoreToDraftAction}>
            <SubmitButton className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50">
              Restore to draft
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* Status transition */}
      <div className="mt-6 rounded border p-4">
        <h2 className="font-semibold">Change status</h2>
        <p className="mt-1 text-sm text-gray-600">
          Transitions are enforced server-side.
        </p>

        <form action={updateStatusAction} className="mt-3 flex flex-wrap items-center gap-2">
          <select
            name="next_status"
            className="rounded border px-2 py-2 text-sm"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="under_offer">under_offer</option>
            <option value="sold">sold</option>
            <option value="archived">archived</option>
          </select>

          <SubmitButton className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Update
          </SubmitButton>
        </form>
      </div>

      {/* Images */}
      <div className="mt-6 rounded border p-4">
        <h2 className="font-semibold">Images</h2>

        {imageRows.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {imageRows.map((img) => (
              <a
                key={img.id}
                href={img.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded border bg-white"
                title={img.storage_path}
              >
                {/* Quick admin preview. Swap to next/image later if you want. */}
                <img
                  src={img.publicUrl}
                  alt="Listing image"
                  className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
                />
                <div className="p-2 text-xs text-gray-600 truncate">
                  {img.storage_path}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600">No images yet.</p>
        )}
      </div>

      {/* Upload hint */}
      <div className="mt-6 text-sm text-gray-600">
        Uploads should go through{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">
          /api/admin/listings/[id]/images
        </code>
        .
      </div>
    </div>
  );
}
