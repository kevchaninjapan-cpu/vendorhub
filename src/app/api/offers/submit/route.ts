import { NextResponse } from "next/server";
import { submitOffer } from "@/lib/offers/actions";
import { sendEmail } from "@/lib/email/client";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import OfferReceived from "@/lib/email/templates/offer-received";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }
    const result = await submitOffer(body.listingId, body);

    // Fire-and-forget email
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
        .from("listings")
        .select("headline, formatted_address, member_id, profiles!inner(email)")
        .eq("id", body.listingId)
        .single();
      const sellerEmail = (data as any)?.profiles?.email;
      if (sellerEmail) {
        const { data: buyer } = await supabase.auth.getUser();
        await sendEmail({
          to: sellerEmail,
          subject: `New offer on ${(data as any).headline ?? "your listing"}`,
          react: OfferReceived({
            amount: body.amount,
            listingTitle: (data as any).headline ?? (data as any).formatted_address ?? "your listing",
            buyerName: buyer.user?.email ?? "A buyer",
          }),
        });
      }
    } catch (e) {
      console.error("[offers] email failed:", e);
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}