// Client-side wrappers for the offer server actions.
//
// The actions return { ok, data } / { ok, error } so their messages survive
// in production. These wrappers keep the original call style - they return
// the data on success and THROW on failure - but the throw happens in the
// browser, where Next.js does not hide the message. Existing try/catch
// blocks in the screens therefore keep working unchanged.

import type { ActionResult } from "@/lib/documents/schema";
import * as actions from "./actions";

async function unwrap<T>(pending: Promise<ActionResult<T>>): Promise<T> {
  const res = await pending;
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export const submitOffer = (...args: Parameters<typeof actions.submitOffer>) =>
  unwrap(actions.submitOffer(...args));

export const counterOffer = (...args: Parameters<typeof actions.counterOffer>) =>
  unwrap(actions.counterOffer(...args));

export const acceptOffer = (...args: Parameters<typeof actions.acceptOffer>) =>
  unwrap(actions.acceptOffer(...args));

export const declineOffer = (...args: Parameters<typeof actions.declineOffer>) =>
  unwrap(actions.declineOffer(...args));