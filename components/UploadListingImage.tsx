"use client";

import { useState } from "react";

export default function UploadListingImage({ listingId }: { listingId: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("listingId", listingId);

    const res = await fetch("/api/images/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      alert("Upload failed: " + data.error);
      return;
    }

    // TODO: store data.url into Supabase 'listings' or 'listing_images' table
    console.log("Uploaded:", data.url);
  }

  return (
    <div className="space-y-2">
      <input type="file" accept="image/*" onChange={uploadImage} />

      {uploading && <p>Uploading…</p>}
      {preview && (
        <img src={preview} alt="Preview" className="w-48 rounded border" />
      )}
    </div>
  );
}