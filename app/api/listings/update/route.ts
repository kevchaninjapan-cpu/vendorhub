// app/api/listings/update/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

type UiStatus = "draft" | "active" | "under_offer" | "sold" | "withdrawn" | "archived";
type DbStatus = Database["public"]["Enums"]["listing_status"]; // adjust if your enum name differs

const uiToDbStatus: Record<UiStatus, DbStatus> = {
  draft: "draft",
  active: "active",
  under_offer: "under_offer",
  sold: "sold",
  withdrawn: "withdrawn",
  archived: "withdrawn", // mapping decision
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      Partial<Database["public"]["Tables"]["listings"]["Update"]> & {
        id?: string;
        status?: UiStatus | null;
      };

    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "Missing listing ID" }, { status: 400 });
    }

    const cookieStore = await cookies(); // Next 15/16: async in route handlers
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

    const { id, status: uiStatus, ...rest } = body;

    const patch: Database["public"]["Tables"]["listings"]["Update"] = {
      ...rest,
      ...(uiStatus !== undefined ? { status: uiToDbStatus[uiStatus] } : {}),
    };

    const { data, error } = await supabase
      .from("listings")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Invalid JSON" }, { status: 400 });
  }
}