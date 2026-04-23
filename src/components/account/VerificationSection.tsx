const STATUS_CONFIG = {
  not_started: {
    label: "Not Started",
    color: "bg-gray-100 text-gray-700",
    description: "You haven't started the verification process yet.",
  },
  pending: {
    label: "Pending Review",
    color: "bg-amber-100 text-amber-800",
    description: "Your documents are under review by our compliance team.",
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-100 text-emerald-800",
    description: "Your account is fully verified.",
  },
};

export default function VerificationSection({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.not_started;

  return (
    <section id="verification" className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Verification Status</h2>

      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.color}`}>
          {config.label}
        </span>
        <p className="text-sm text-gray-600">{config.description}</p>
      </div>

      {status === "not_started" && (
        <a
          href="/onboarding/details"
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Start verification →
        </a>
      )}
    </section>
  );
}