export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Access restricted</h1>
      <p className="mt-3 text-sm text-gray-600">
        You’re signed in, but your account doesn’t currently have access to this area.
        If you believe this is a mistake, contact the site administrator.
      </p>
    </main>
  );
}