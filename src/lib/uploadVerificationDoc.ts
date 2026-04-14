import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadVerificationDoc(params: {
  docType: "government_id" | "proof_of_residence";
  file: File;
}) {
  const res = await fetch("/api/storage/create-signed-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      docType: params.docType,
      filename: params.file.name,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Failed to create signed upload URL.");

  const { bucket, path, token } = json as {
    bucket: string;
    path: string;
    token: string;
  };

  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, params.file, {
      contentType: params.file.type,
    });

  if (error) throw new Error(error.message);

  return { bucket, path };
}

// ✅ Alias export so both imports work:
export const uploadVerificationDocument = uploadVerificationDoc;