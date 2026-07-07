import { NextResponse } from "next/server";
import { acceptOffer } from "@/lib/offers/actions";
import { sendEmail } from "@/lib/email/client";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import OfferAccepted from "@/lib/email/templates/offer-accepted";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    await acceptOffer(id);

    // Fire-and-forget email to buyer
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
        }
      );
      const { data } = await supabase
        .from("offers")
        .select("amount, buyer_id, profiles!inner(email), listings!inner(headline, formatted_address)")
        .eq("id", id)
        .single();
      const buyerEmail = (data as any)?.profiles?.email;
      if (buyerEmail) {
        await sendEmail({
          to: buyerEmail,
          subject: "Your offer was accepted",
          react: OfferAccepted({
            amount: (data as any).amount,
            listingTitle: (data as any).listings?.headline ?? (data as any).listings?.formatted_address ?? "the listing",
          }),
        });
      }
    } catch (e) {
      console.error("[offers] accept-email failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}