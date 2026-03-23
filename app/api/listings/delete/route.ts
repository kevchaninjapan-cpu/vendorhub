// app/api/listings/delete/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

type DeleteBody = { id: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteBody;

    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "Missing listing ID" }, { status: 400 });
    }

    // In Next.js 15/16, cookies() is async in Route Handlers
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

    // Optional auth guard (uncomment if delete should require auth)
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Optional ownership guard (uncomment and ensure your schema has owner_id)
    // const { error: delErr } = await supabase
    //   .from("listings")
    //   .delete()
    //   .eq("id", body.id)
    //   .eq("owner_id", user.id);

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Invalid JSON" },
      { status: 400 }
    );
  }
}