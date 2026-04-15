// app/learn-more/page.tsx
export default function LearnMorePage() {
  return (
    <main className="bg-white">
      
      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <span className="text-xs tracking-widest text-blue-600 font-semibold">
          THE JOURNEY
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-gray-900">
          Selling Reinvented with{" "}
          <span className="text-blue-600">Intelligent Automation</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          A curated eight‑step process combining targeted marketing with
          automated precision. Experience a seamless transition from listing
          to settlement.
        </p>
      </section>

      {/* STEPS */}
      {steps.map((step, i) => (
        <section
          key={step.number}
          className={`max-w-6xl mx-auto px-6 py-20 grid gap-12 items-center ${
            i % 2 === 0 ? "md:grid-cols-2" : "md:grid-cols-2 md:flex-row-reverse"
          }`}
        >
          <div>
            <div className="text-blue-600 text-3xl font-bold">
              {step.number}
            </div>
            <h3 className="mt-4 text-2xl font-semibold">
              {step.title}
            </h3>
            <p className="mt-4 text-gray-600">{step.description}</p>
            {step.badge && (
              <div className="mt-4 text-sm text-blue-600 font-medium">
                {step.badge}
              </div>
            )}
          </div>

          <div className="bg-gray-100 rounded-xl h-64 w-full" />
          {/* Replace with <Image /> later */}
        </section>
      ))}

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-16 px-6">
          <h2 className="text-3xl font-bold">Ready to sell smarter?</h2>
          <p className="mt-4 text-blue-100 max-w-xl mx-auto">
            Join homeowners nationwide leveraging VendorHub automation
            for premium results.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button className="bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold">
              Start Selling Now
            </button>
            <button className="border border-white px-6 py-3 rounded-lg font-semibold">
              Have Questions? Contact Us
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

const steps = [
  {
    number: "01",
    title: "Create an Account",
    description:
      "Enter your details to create a free account is easy and fast. When you're ready for more get verfied to access all features.",
    badge: "Instant access",
  },
  {
    number: "02",
    title: "Build Your Listing",
    description:
      "Do it yourself with our professional guidance, or we can do it with your or for you. Upload Essential Documents to make your property Ready to buy.",
    badge: "Guided compliance, no time wasted with motivated buyers",
  },
  {
    number: "03",
    title: "Intelligent Appraisal",
    description:
      "Automated valuation based off real time market data. Our E-Evaluation provides an accurate, current market value for your property.",
    badge: "95%+ accuracy rate",
  },
  {
    number: "04",
    title: "Strategic Marketing",
    description:
      "You choose how and where to market your property. Trade Me, Realestate.co.nz, HouGarden and Social Media channels. It's your listing, your choice.",
    badge: "One‑click omni‑channel",
  },
  {
    number: "05",
    title: "Open Home Management",
    description:
      "An online booking system with automated reminders and follow‑ups for every buyer. Too busy to host? We can help with that too.",
  },
  {
    number: "06",
    title: "Omni‑Inbox Engagement",
    description:
      "All communications funnel into one unified inbox with smart automation. We filter out the noise and highlight serious buyers, so you can focus on what matters.",
  },
  {
    number: "07",
    title: "Be confident with secure and confidential negotiation tools",
    description:
      "Negotiate securely, counter offer and settle with peace of mind. Generate contract‑ready documents instantly. Negotiation tools and guidance to help you get the best offer.",
    badge: "End‑to‑end encryption",
  },
  {
    number: "08",
    title: "Seamless Settlement & Handover",
    description:
      "Final checklists and automated reminders guide you to settlement with confidence.",
    badge: "Success & settlement",
  },
];