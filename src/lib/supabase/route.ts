// src/lib/supabase/route.ts
import "server-only";
import supabaseServer from "@/lib/supabaseServer";

/**
 * Backwards-compatible helper for Route Handlers.
 * Some older code expects `createRouteHandlerClient()` from "@/lib/supabase/route".
 *
 * We reuse your existing cookie-wired server client.
 */
export async function createRouteHandlerClient(..._args: any[]) {
  return await supabaseServer();
}