"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { ActionResult } from "@/lib/documents/schema";
import { notifyNewMessage } from "./notify";

const ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in first.",
  MESSAGE_EMPTY: "Please write a message.",
  MESSAGE_TOO_LONG: "Messages can be up to 2,000 characters.",
  CONVERSATION_NOT_FOUND: "That conversation no longer exists.",
  NOT_PARTICIPANT: "You aren't part of this conversation.",
};

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
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* ignore in RSC */
          }
        },
      },
    }
  );
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error("[messages]", e);
    const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
    return { ok: false, error: ERRORS[msg] ?? msg };
  }
}

export async function sendMessage(conversationId: string, body: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const text = (body ?? "").trim();
    if (!text) throw new Error("MESSAGE_EMPTY");
    if (text.length > 2000) throw new Error("MESSAGE_TOO_LONG");

    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("AUTH_REQUIRED");

    const { data, error } = await supabase.rpc("send_listing_message", {
      p_conversation_id: conversationId,
      p_body: text,
    });
    if (error) throw new Error(error.message);

    await notifyNewMessage(conversationId, user.id, text);

    revalidatePath("/account/messages");
    revalidatePath(`/account/messages/${conversationId}`);
    return { id: data as string };
  });
}

export async function markRead(conversationId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const supabase = await getSupabase();
    const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
    if (error) throw new Error(error.message);
    revalidatePath("/account/messages");
    return { id: conversationId };
  });
}