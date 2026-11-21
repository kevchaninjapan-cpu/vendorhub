import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Daily job: deletes ID documents 30 days after a check is decided, plus any
// ID file older than 30 days that no check points to. Keeps the record that
// the check happened and its result, so verified buyers stay verified.
//
// Called by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set in the
// project. Anyone without it gets a 404.
//
// Add ?dry=1 to see what would be deleted without deleting anything.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "verifications";
const DAYS = 30;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

type Due = { id: string; user_id: string; paths: string[] | null };

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  const { data: dueData, error: dueErr } = await supabaseAdmin.rpc("verification_docs_due", {
    p_days: DAYS,
    p_limit: 200,
  });
  if (dueErr) {
    console.error("[id-retention] due lookup failed:", dueErr.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  const due = (dueData ?? []) as Due[];

  let purged = 0;
  let failed = 0;

  if (!dry) {
    for (const row of due) {
      const paths = (row.paths ?? []).filter((p) => typeof p === "string" && p.length > 0);
      if (paths.length > 0) {
        const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
        if (rmErr) {
          console.error("[id-retention] file delete failed:", row.id, rmErr.message);
          failed++;
          continue; // keep the paths so the next run retries
        }
      }
      const { error: markErr } = await supabaseAdmin.rpc("mark_verification_docs_deleted", { p_id: row.id });
      if (markErr) {
        console.error("[id-retention] mark failed:", row.id, markErr.message);
        failed++;
      } else {
        purged++;
      }
    }
  }

  const { data: orphanData } = await supabaseAdmin.rpc("verification_orphan_files", {
    p_days: DAYS,
    p_limit: 500,
  });
  const orphans = ((orphanData ?? []) as { name: string }[]).map((o) => o.name).filter(Boolean);
  let orphansRemoved = 0;

  if (!dry && orphans.length > 0) {
    const { data: removed, error: oErr } = await supabaseAdmin.storage.from(BUCKET).remove(orphans);
    if (oErr) {
      console.error("[id-retention] orphan delete failed:", oErr.message);
    } else {
      orphansRemoved = removed?.length ?? 0;
      await supabaseAdmin.from("audit_log").insert({
        actor_id: null,
        action: "verification_orphan_files_deleted",
        target_type: "storage",
        target_id: null,
        metadata: { count: orphansRemoved, reason: "retention_30_days" },
      });
    }
  }

  return NextResponse.json({
    dry,
    checks_due: due.length,
    checks_purged: purged,
    checks_failed: failed,
    orphan_files: orphans.length,
    orphan_files_removed: orphansRemoved,
  });
}