"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailUser } from "@/lib/email/notify";
import { verificationFormSchema, type VerificationForm } from "./schema";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch { /* ignore */ }
        },
      },
    }
  );
}

async function requireUser() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?next=/account/verify");
  return { supabase, user };
}

export async function submitVerification(input: VerificationForm) {
  const validated = verificationFormSchema.parse(input);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("submit_verification", {
    p_id_doc_path: validated.id_doc_path,
    p_id_doc_type: validated.id_doc_type,
    p_address_proof_path: validated.address_proof_path,
    p_selfie_path: validated.selfie_path ?? null,
    p_notes: { notes: validated.notes ?? null },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/account/verify");
  revalidatePath("/account");
  return { id: data as string };
}

export async function reviewVerification(
  verificationId: string,
  approved: boolean,
  reason: string
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("review_verification", {
    p_verification_id: verificationId,
    p_approved: approved,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);

  // Tell the person who submitted it. The review function has already
  // checked the reviewer is staff.
  const { data: row } = await supabaseAdmin
    .from("verifications")
    .select("user_id")
    .eq("id", verificationId)
    .maybeSingle();
  const userId = (row as { user_id: string } | null)?.user_id;

  if (userId) {
    if (approved) {
      await emailUser({
        userId,
        subject: "You're verified on VendorHub",
        heading: "Your identity has been verified",
        lines: [
          "Thanks for verifying your identity. You can now make offers and download property documents such as LIM reports.",
        ],
        buttonLabel: "Browse homes",
        path: "/buy",
        label: "verification.approved",
      });
    } else {
      await emailUser({
        userId,
        subject: "We couldn't verify your identity",
        heading: "We couldn't verify your identity",
        lines: [
          "We weren't able to approve your identity check.",
          reason?.trim() ? `Reason: ${reason.trim()}` : "",
          "You can submit new documents at any time.",
        ],
        buttonLabel: "Try again",
        path: "/account/verify",
        label: "verification.rejected",
      });
    }
  }

  revalidatePath("/verifications/queue");
  return { ok: true };
}