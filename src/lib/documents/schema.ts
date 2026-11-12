import { z } from "zod";

export const DOCUMENT_TYPES = [
  "lim",
  "title",
  "building_report",
  "sale_purchase_agreement",
  "floor_plan",
  "other",
] as const;

export const DOCUMENT_VISIBILITIES = ["private", "verified_buyers", "public"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

// Types where only one current document is kept. Uploading a new one
// replaces the old one, so buyers can never download a superseded LIM.
export const SINGLE_CURRENT_TYPES: readonly DocumentType[] = ["lim", "title"];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  lim: "LIM report",
  title: "Record of title",
  building_report: "Building report",
  sale_purchase_agreement: "Sale & purchase agreement",
  floor_plan: "Floor plan",
  other: "Other document",
};

export const DOCUMENT_VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  private: "Private - only you can see this",
  verified_buyers: "Verified buyers - listed publicly, download needs ID verification",
  public: "Public - any signed-in user can download",
};

export const DOCUMENT_VISIBILITY_SHORT: Record<DocumentVisibility, string> = {
  private: "Only me",
  verified_buyers: "Verified buyers",
  public: "Signed-in users",
};

// 25 MB. LIMs with aerial imagery often run to 10-15 MB.
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const documentUploadSchema = z.object({
  listing_id: z.string().uuid(),
  doc_type: z.enum(DOCUMENT_TYPES),
  visibility: z.enum(DOCUMENT_VISIBILITIES).default("verified_buyers"),
  file_name: z.string().min(1).max(255),
  file_size: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
  mime_type: z.string().min(1),
  label: z.string().max(200).optional(),
});

export type DocumentUpload = z.input<typeof documentUploadSchema>;

// doc_type is deliberately not editable after upload. Changing a document
// into a LIM or title would bypass the one-current-document rule.
export const documentUpdateSchema = z.object({
  visibility: z.enum(DOCUMENT_VISIBILITIES).optional(),
  label: z.string().max(200).optional(),
});

export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;

export type ListingDocument = {
  id: string;
  listing_id: string;
  uploaded_by: string | null;
  doc_type: DocumentType;
  visibility: DocumentVisibility;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  label: string | null;
  created_at: string;
  updated_at: string;
};

// Buyer-facing shape. Never includes file_path.
export type PublicListingDocument = Omit<ListingDocument, "file_path" | "uploaded_by">;

// Server actions return this instead of throwing. Next.js hides the message
// of errors thrown from server actions in production, so a thrown
// "Please verify your ID" would reach the user as a generic failure.
export type ActionResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: string; data?: undefined };

export function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}