import { createClient } from "@/lib/supabase/client"; // adjust if your path differs

type DocType = "government_id" | "proof_of_residence";

export async function uploadVerificationDoc({
  docType,
  file,
}: {
  docType: DocType;
  file: File;
}) {
  const supabase = createClient();

  // 1) must have a logged in user (uploads are typically per-user)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated (no user).");

  // 2) bucket name — this is the #1 cause of "resource does not exist"
  // CHANGE this to your actual bucket name in Supabase Storage:
  const BUCKET = "verification-documents";

  // 3) deterministic per-user path (keeps objects unique)
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${user.id}/${docType}/${Date.now()}_${safeName}`;

  // 4) upload first
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadErr) {
    // This will reveal the real cause (bucket missing, RLS, permissions, etc)
    throw new Error(
      `Upload failed: ${uploadErr.message} (bucket=${BUCKET}, path=${path})`
    );
  }

  // 5) optional: create a signed URL to confirm the object exists
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (signErr) {
    // If you hit "related resource does not exist" here,
    // your upload went to a different bucket/path than you think
    throw new Error(
      `Signed URL failed: ${signErr.message} (bucket=${BUCKET}, path=${path})`
    );
  }

  return {
    path,
    signedUrl: signed?.signedUrl ?? null,
  };
}
``