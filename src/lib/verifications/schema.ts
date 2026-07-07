import { z } from "zod";

export const verificationFormSchema = z.object({
  id_doc_type: z.enum(["passport", "drivers_licence", "national_id"]),
  id_doc_path: z.string().min(3),
  address_proof_path: z.string().min(3),
  selfie_path: z.string().min(3).optional(),
  notes: z.string().max(500).optional(),
});

export type VerificationForm = z.infer<typeof verificationFormSchema>;