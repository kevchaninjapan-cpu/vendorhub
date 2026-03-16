// app/admin/properties/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";

export default async function PropertiesPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Properties</h1>
      <p>Welcome {user?.email}. This section will display all VendorHub listings.</p>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "white",
        }}
      >
        <p>Property management tools will appear here…</p>
      </div>
    </div>
  );
}
