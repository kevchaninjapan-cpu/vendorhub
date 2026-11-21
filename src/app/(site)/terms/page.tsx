// DRAFT - have a lawyer review before launch.
export const metadata = {
  title: "Terms of use | VendorHub",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-6 text-slate-700">
      <h1 className="text-2xl font-semibold text-slate-900">Terms of use</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: November 2026</p>

      <h2 className="mt-8 text-base font-semibold text-slate-900">1. About these terms</h2>
      <p className="mt-2">
        These terms apply to everyone who uses the VendorHub website and services. By using the site you agree to
        them. If you don&apos;t agree, please don&apos;t use the site.
      </p>

      <h2 className="mt-8 text-base font-semibold text-slate-900">2. Our content and data</h2>
      <p className="mt-2">
        The VendorHub website, including its design, layout, text, graphics, software, source code, listing
        presentation, valuation estimates and the compilation of property data, is owned by VendorHub or its
        licensors and is protected by copyright, including under the Copyright Act 1994, and other laws.
        &ldquo;VendorHub&rdquo; and our logos are our trade marks.
      </p>
      <p className="mt-2">
        Listings remain the property of the sellers who create them. Some suburb and boundary data is supplied by
        Toit&#363; Te Whenua Land Information New Zealand under the Creative Commons Attribution 4.0 licence.
      </p>

      <h2 className="mt-8 text-base font-semibold text-slate-900">3. What you must not do</h2>
      <p className="mt-2">Without our written permission, you must not:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>
          use any robot, scraper, crawler, spider or other automated means to access, collect, copy or monitor any
          part of the site or its data;
        </li>
        <li>
          use any content or data from the site to train, fine-tune, test or improve any artificial intelligence or
          machine learning model, or include it in any dataset;
        </li>
        <li>
          copy, reproduce, imitate or create a website, app or service that copies or is substantially similar to
          the site&apos;s design, features, layout or content;
        </li>
        <li>access the site&apos;s database or programming interfaces other than through the site itself;</li>
        <li>get around, disable or interfere with any security, rate limit or access control;</li>
        <li>frame or mirror any part of the site, or republish listings or valuations elsewhere;</li>
        <li>use the site for any unlawful purpose, or to contact users for anything other than a genuine property enquiry.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold text-slate-900">4. Valuation estimates</h2>
      <p className="mt-2">
        Valuation estimates are automated indications only. They are not registered valuations and should not be
        relied on as financial advice.
      </p>

      <h2 className="mt-8 text-base font-semibold text-slate-900">5. Breaches</h2>
      <p className="mt-2">
        If you breach these terms we may suspend or close your account, block your access, and take legal action,
        including seeking damages and orders to stop the breach.
      </p>

      <h2 className="mt-8 text-base font-semibold text-slate-900">6. Changes</h2>
      <p className="mt-2">
        We may update these terms from time to time. The version on this page applies from the date shown above.
      </p>

      <h2 className="mt-8 text-base font-semibold text-slate-900">7. Governing law</h2>
      <p className="mt-2">These terms are governed by the laws of New Zealand.</p>
    </div>
  );
}