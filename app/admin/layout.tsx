// app/admin/layout.tsx
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
    </div>
  );
}
``