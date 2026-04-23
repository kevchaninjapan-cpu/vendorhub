// src/lib/supabaseAdmin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[ADMIN] url:", url?.slice(0, 30));
  console.log("[ADMIN] serviceKey length:", serviceKey?.length);
  console.log("[ADMIN] serviceKey role:", (() => {
    try {
      const payload = serviceKey?.split(".")[1];
      if (!payload) return "MISSING";
      return JSON.parse(Buffer.from(payload, "base64").toString()).role;
    } catch {
      return "PARSE_ERROR";
    }
  })());

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default supabaseAdmin;