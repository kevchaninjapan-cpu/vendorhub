// app/admin/settings/page.tsx
export default function AdminSettingsPage() {
  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Settings</h1>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "white",
          display: "grid",
          gap: 12,
        }}
      >
        <p>Admin settings will go here.</p>
        <p>You can add feature toggles, business settings, roles, etc.</p>
      </div>
    </div>
  );
}