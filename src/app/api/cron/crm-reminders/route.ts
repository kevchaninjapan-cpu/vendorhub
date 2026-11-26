import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailUser } from "@/lib/email/notify";
import { formatDateOnly } from "@/lib/viewings/request-schema";

// Daily: one email per seller listing their follow-ups due today or
// overdue (Pro and Elite listings). Each task is reminded at most once a
// day. Called by Vercel Cron with "Authorization: Bearer <CRON_SECRET>".
// Add ?dry=1 to see what would be sent without sending.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

type Due = { task_id: string; seller_id: string; title: string; due_on: string; listing_title: string };

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  const { data, error } = await supabaseAdmin.rpc("crm_due_reminders");
  if (error) {
    console.error("[crm-reminders] lookup failed:", error.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  const rows = (data ?? []) as Due[];

  const bySeller = new Map<string, Due[]>();
  for (const r of rows) {
    const list = bySeller.get(r.seller_id) ?? [];
    list.push(r);
    bySeller.set(r.seller_id, list);
  }

  let sent = 0;
  if (!dry) {
    for (const [sellerId, tasks] of bySeller) {
      const lines = tasks.slice(0, 10).map((t) => `${t.title} - ${t.listing_title} (due ${formatDateOnly(t.due_on)})`);
      if (tasks.length > 10) lines.push(`...and ${tasks.length - 10} more.`);
      await emailUser({
        userId: sellerId,
        subject: tasks.length === 1 ? "1 buyer follow-up due today" : `${tasks.length} buyer follow-ups due today`,
        heading: "Your follow-ups for today",
        lines: ["These buyer follow-ups are due or overdue:", ...lines],
        buttonLabel: "Open your buyer pipeline",
        path: "/account/pipeline",
        label: "crm.reminder",
      });
      const { error: markErr } = await supabaseAdmin.rpc("crm_mark_reminded", {
        p_ids: tasks.map((t) => t.task_id),
      });
      if (markErr) console.error("[crm-reminders] mark failed:", markErr.message);
      else sent++;
    }
  }

  return NextResponse.json({ dry, tasks: rows.length, sellers: bySeller.size, emails_sent: sent });
}