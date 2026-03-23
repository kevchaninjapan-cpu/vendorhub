// app/api/listings/upload/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs"; // required for file uploads in Next 15/16

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const listingId = formData.get("listingId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options?: CookieOptions) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, _options?: CookieOptions) {
            cookieStore.delete(name);
          },
        },
      }
    );

    // Get authenticated user to enforce folder correctness
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Policy requires: listings/{user_id}/{listingId}/{filename}
    const filePath = `listings/${user.id}/${listingId}/${file.name}`;

    const { error } = await supabase.storage
      .from("listing-photos")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${filePath}`;

    return NextResponse.json({ success: true, path: filePath, url: publicUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 400 }
    );
  }
}