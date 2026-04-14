"use client";

import { approveVerification, rejectVerification } from "./review-actions.server";

export default function ReviewActions({ userId }: { userId: string }) {
  return (
    <div className="mt-8 grid gap-4">
      <form action={approveVerification}>
        <input type="hidden" name="userId" value={userId} />
        <button className="bg-green-600 text-white px-4 py-2 rounded">
          Approve
        </button>
      </form>

      <form action={rejectVerification} className="grid gap-2">
        <input type="hidden" name="userId" value={userId} />
        <textarea
          name="reason"
          required
          placeholder="Reason for rejection"
          className="border p-2 rounded"
        />
        <button className="bg-red-600 text-white px-4 py-2 rounded">
          Reject
        </button>
      </form>
    </div>
  );
}