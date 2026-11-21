// DRAFT privacy policy - have a lawyer review before launch.
//
// Written to match what VendorHub actually does as of November 2026. If a
// feature changes what personal information is collected, shared or kept,
// update this page at the same time.
//

import Link from "next/link";

export const metadata = {
  title: "Privacy policy | VendorHub",
  description: "How VendorHub collects, uses, shares and protects your personal information.",
};

const EMAIL = "support@vendorhub.co.nz";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-base font-semibold text-slate-900">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-sm leading-6 text-slate-700">
      <h1 className="text-2xl font-semibold text-slate-900">Privacy policy</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: November 2026</p>

      <p className="mt-6">
        This policy explains how VendorHub collects, uses, shares and protects personal information, and the
        choices and rights you have. We follow the Privacy Act 2020 and its information privacy principles.
      </p>

      <H2>1. Who we are</H2>
      <p className="mt-2">
        VendorHub is a New Zealand property marketplace that helps people sell their homes without an agent and
        helps buyers find, view and make offers on them. Our Privacy Officer can be contacted at{" "}
        <a href={`mailto:${EMAIL}`} className="underline">
          {EMAIL}
        </a>
        .
      </p>

      <H2>2. What we collect</H2>
      <ul className="mt-2 list-disc space-y-2 pl-6">
        <li>
          <strong>Account details:</strong> your name, email address, phone number and password (stored in
          encrypted form).
        </li>
        <li>
          <strong>Identity verification:</strong> before you can make offers or download most property documents,
          we ask for an identity document, proof of address and, in some cases, a photo of you. These are used only
          to confirm who you are.
        </li>
        <li>
          <strong>Listings (sellers):</strong> property address and details, photos, descriptions, price
          information and documents such as LIM reports and records of title.
        </li>
        <li>
          <strong>Offers, messages and viewings:</strong> offers you make or receive, messages you send through
          VendorHub, and open home or private viewing bookings, including the name and phone number you give when
          booking.
        </li>
        <li>
          <strong>Valuation searches:</strong> addresses you look up with our estimate tool.
        </li>
        <li>
          <strong>Technical information:</strong> which listings are viewed, the website that referred you, and a
          scrambled (one-way encrypted) version of your internet address used to limit excessive or automated use and to count unique visitors to listings. This code changes every day, so it can't be used to follow you over time. We do not store your actual internet address.
        </li>
        <li>
          <strong>Error reports:</strong> if something goes wrong on the site, a technical error report is created.
          These reports are set up to exclude your name, internet address, cookies and anything you type into forms.
        </li>
      </ul>
      <p className="mt-2">
        We collect this information from you directly. If we ever collect information about you from someone else,
        we will let you know where it came from, unless the law allows otherwise.
      </p>

      <H2>3. Why we use it</H2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>to create and run your account;</li>
        <li>to verify identity, so sellers know offers and document requests come from real people;</li>
        <li>to publish listings and connect buyers and sellers;</li>
        <li>to arrange viewings, pass on offers and deliver messages;</li>
        <li>to send emails about your account, listings, offers, viewings and messages;</li>
        <li>to keep VendorHub secure, prevent fraud, and stop automated copying of the site;</li>
        <li>to meet our legal obligations.</li>
      </ul>
      <p className="mt-2">We do not sell your personal information, and we do not use it for third-party advertising.</p>

      <H2>4. Who can see your information</H2>
      <ul className="mt-2 list-disc space-y-2 pl-6">
        <li>
          <strong>The public:</strong> live listings are public, including photos and property details. Sellers can
          choose to hide the exact street address, in which case only the suburb and an approximate location are
          shown.
        </li>
        <li>
          <strong>Sellers:</strong> when you book a viewing, send a viewing request or make an offer, the seller sees
          your name and, for viewings, your phone number. Messages you send are seen by the other person in the
          conversation. Your email address is not shared with other users.
        </li>
        <li>
          <strong>Buyers:</strong> buyers see the documents a seller chooses to share. Most documents can only be
          downloaded by verified buyers.
        </li>
        <li>
          <strong>Our team:</strong> a small number of VendorHub staff can see identity documents (to approve
          verification) and listings (to review them before they go live).
        </li>
        <li>
          <strong>Service providers</strong> who help us run VendorHub, under their own privacy and security
          commitments: Supabase (database and file storage), Vercel (website hosting), Resend (email delivery) and
          Sentry (error monitoring). They may only use your information to provide their service to us.
        </li>
        <li>
          <strong>When the law requires it,</strong> for example to the Police or a court, or to prevent a serious
          threat to someone&apos;s safety.
        </li>
      </ul>

      <H2>5. Storage outside New Zealand</H2>
      <p className="mt-2">
        Some of our service providers store information on servers outside New Zealand. For example, error reports
        are processed in the European Union. Before we use a provider overseas, we take reasonable steps to make
        sure your information will be protected in a way that is comparable to the Privacy Act 2020.
      </p>

      <H2>6. How we protect it</H2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>identity documents and property documents are kept in private storage, not on public web links;</li>
        <li>document downloads use links that expire after a short time;</li>
        <li>database access is restricted so each person can only see the information they are entitled to;</li>
        <li>access to sensitive information and documents is logged.</li>
      </ul>

      <H2>7. Cookies</H2>
      <p className="mt-2">
        We use cookies only to keep you signed in and to keep the site secure. We do not use advertising cookies.
        If we start using analytics cookies, we will update this policy first.
      </p>

      <H2>8. How long we keep it</H2>
      <p className="mt-2">
        We keep personal information only for as long as we need it for the purposes above or as the law requires.
        Identity documents (your ID, proof of address and any photo of you) are deleted 30 days after your identity check is approved or declined. We keep a record that the check took place, its result and the date, so you stay verified. When you close your account, we delete or anonymise your personal information, except
        where we must keep a record by law, such as a record of a completed offer.
      </p>

      <H2>9. Your rights</H2>
      <p className="mt-2">
        You can ask for a copy of the personal information we hold about you, and ask us to correct it. Email{" "}
        <a href={`mailto:${EMAIL}`} className="underline">
          {EMAIL}
        </a>
        . We will respond within 20 working days. We may need to confirm your identity first.
      </p>
      <p className="mt-2">
        If you are not happy with how we have handled your information, please tell us so we can try to put it
        right. You can also complain to the Office of the Privacy Commissioner at{" "}
        <a href="https://www.privacy.org.nz" className="underline" rel="noopener noreferrer" target="_blank">
          privacy.org.nz
        </a>
        .
      </p>

      <H2>10. If something goes wrong</H2>
      <p className="mt-2">
        If a privacy breach happens that has caused, or is likely to cause, serious harm, we will notify the
        Privacy Commissioner and the people affected as soon as practicable, as the law requires.
      </p>

      <H2>11. Changes to this policy</H2>
      <p className="mt-2">
        We may update this policy. The date at the top shows when it last changed. If we make a significant change,
        we will let you know by email or on the site.
      </p>

      <p className="mt-10 text-xs text-slate-500">
        See also our{" "}
        <Link href="/terms" className="underline">
          terms of use
        </Link>
        .
      </p>
    </div>
  );
}