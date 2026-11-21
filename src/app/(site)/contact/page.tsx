import Link from "next/link";

export const metadata = {
  title: "Contact | VendorHub",
  description: "Get in touch with the VendorHub team.",
};

const EMAIL = "support@vendorhub.co.nz";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-sm leading-6 text-slate-700">
      <h1 className="text-2xl font-semibold text-slate-900">Contact us</h1>
      <p className="mt-4">
        We&apos;d love to hear from you. Email us at{" "}
        <a href={`mailto:${EMAIL}`} className="font-medium text-slate-900 underline">
          {EMAIL}
        </a>{" "}
        and we&apos;ll get back to you as soon as we can.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Buying or selling</h2>
          <p className="mt-2">
            Questions about a listing are best sent to the seller using the enquiry form on the listing. You&apos;ll
            find the conversation in your{" "}
            <Link href="/account/messages" className="underline">
              messages
            </Link>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Help with your account</h2>
          <p className="mt-2">
            For help with signing in, identity verification, packs or anything else, email us and include the email
            address your account uses.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Privacy requests</h2>
          <p className="mt-2">
            To ask for a copy of your information, or to correct it, email us with &ldquo;Privacy request&rdquo; in
            the subject line. See our{" "}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Reporting a problem</h2>
          <p className="mt-2">
            If a listing looks misleading or something on the site isn&apos;t working, email us with the link to the
            page and a short description.
          </p>
        </div>
      </div>
    </div>
  );
}