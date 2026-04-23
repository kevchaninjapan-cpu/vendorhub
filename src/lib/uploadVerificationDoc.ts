import { createClient } from "@/lib/supabase/client";

type DocType = "government_id" | "proof_of_residence";

export async function uploadVerificationDoc({
  docType,
  file,
}: {
  docType: DocType;
  file: File;
}) {
  const supabase = createClient();

  // 1) Auth check
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated.");

  const BUCKET = "verification-documents";
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${user.id}/${docType}/${Date.now()}_${safeName}`;

  // 2) Upload to Storage
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadErr) {
    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  // 3) ✅ Save to DB via server route — uses admin client server-side
  const res = await fetch("/api/docs/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      doc_type: docType,
      file_path: path,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error ?? "Failed to save document record.");
  }

  // 4) Signed URL
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (signErr) {
    throw new Error(`Signed URL failed: ${signErr.message}`);
  }

  return {
    path,
    signedUrl: signed?.signedUrl ?? null,
  };
}