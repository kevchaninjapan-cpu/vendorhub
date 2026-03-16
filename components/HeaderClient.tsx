"use client";

import { useState, useTransition } from "react";

export default function HeaderClient() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function handlePromote() {
    setMsg(null);
    start(async () => {
      try {
        const res = await fetch("/api/admin/promote", {
          method: "POST",
        });
        const json = await res.json();
        if (!res.ok) {
          setMsg(json?.error ?? "Promotion failed");
          return;
        }
        setMsg("You’re now an admin. Please log out and in again.");
      } catch (e: any) {
        setMsg(e?.message ?? "Network error");
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button
        onClick={handlePromote}
        disabled={pending}
        style={{ padding: "6px 10px", border: "1px solid #999", borderRadius: 6 }}
      >
        {pending ? "Promoting…" : "Promote me to Admin"}
      </button>
      {msg && <span style={{ fontSize: 12, color: "#888" }}>{msg}</span>}
    </div>
  );
}