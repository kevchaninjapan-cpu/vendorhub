"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { ActionResult } from "@/lib/documents/schema";

// Buyer pipeline actions. Ownership and pack limits are checked in the
// database; these just pass the request on and turn codes into messages.

const ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in first.",
  NOT_LISTING_OWNER: "You can only manage buyers on your own listings.",
  LEAD_NOT_FOUND: "That buyer is no longer in your pipeline.",
  PRO_FEATURE: "Pipeline stages, follow-up tasks and reminders come with the Pro and Elite packs.",
  STAGE_INVALID: "That stage isn't valid.",
  TEMPERATURE_INVALID: "That label isn't valid.",
  TASK_INVALID: "Add a short task (up to 200 characters) and a due date.",
  TASK_NOT_FOUND: "That task no longer exists.",
};

const UUID = /^[0-9a-f-]{36}$/i;

async function db() {
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

async function call(fn: string, params: Record<string, unknown>): Promise<ActionResult<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.rpc(fn, params);
    if (error) {
      const code = Object.keys(ERRORS).find((k) => error.message.includes(k));
      return { ok: false, error: code ? ERRORS[code] : "Something went wrong. Please try again." };
    }
    revalidatePath("/account/pipeline");
    return { ok: true, data: null };
  } catch (e) {
    console.error("[crm]", fn, e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function updateLead(
  listingId: string,
  buyerId: string,
  patch: { stage?: string; clearStage?: boolean; temperature?: string; notes?: string }
): Promise<ActionResult<null>> {
  if (!UUID.test(listingId) || !UUID.test(buyerId)) return { ok: false, error: ERRORS.LEAD_NOT_FOUND };
  return call("crm_update_lead", {
    p_listing_id: listingId,
    p_buyer_id: buyerId,
    p_stage: patch.stage ?? null,
    p_clear_stage: patch.clearStage ?? false,
    p_temperature: patch.temperature ?? null,
    p_notes: patch.notes ?? null,
  });
}

export async function addTask(listingId: string, buyerId: string, title: string, dueOn: string): Promise<ActionResult<null>> {
  if (!UUID.test(listingId) || !UUID.test(buyerId)) return { ok: false, error: ERRORS.LEAD_NOT_FOUND };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) || !title.trim()) return { ok: false, error: ERRORS.TASK_INVALID };
  return call("crm_add_task", { p_listing_id: listingId, p_buyer_id: buyerId, p_title: title.trim(), p_due_on: dueOn });
}

export async function setTaskDone(taskId: string, done: boolean): Promise<ActionResult<null>> {
  if (!UUID.test(taskId)) return { ok: false, error: ERRORS.TASK_NOT_FOUND };
  return call("crm_set_task_done", { p_task_id: taskId, p_done: done });
}

export async function deleteTask(taskId: string): Promise<ActionResult<null>> {
  if (!UUID.test(taskId)) return { ok: false, error: ERRORS.TASK_NOT_FOUND };
  return call("crm_delete_task", { p_task_id: taskId });
}