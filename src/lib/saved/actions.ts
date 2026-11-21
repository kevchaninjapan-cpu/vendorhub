"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { ActionResult } from "@/lib/documents/schema";

export async function removeSavedListing(listingId: string): Promise<ActionResult<{ id: string }>> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(listingId)) return { ok: false, error: "That home couldn't be found." };

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            try {
              toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              /* ignore in RSC */
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in first." };

    // The row rule only lets people delete their own saved homes.
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) return { ok: false, error: "Couldn't remove that home. Please try again." };

    revalidatePath("/account/saved");
    revalidatePath("/account");
    return { ok: true, data: { id: listingId } };
  } catch (e) {
    console.error("[saved] remove failed:", e);
    return { ok: false, error: "Couldn't remove that home. Please try again." };
  }
}