import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-32">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
          Sell your home your way, privately.
          <br />
          <span className="text-indigo-600">Modern tools. Full control.</span>
        </h1>

        <p className="mt-6 text-lg text-gray-600 max-w-2xl">
          VendorHub gives Kiwi homeowners the power to list, market, and manage their
          sale with professional-grade tools — without paying agent commissions.
        </p>

       
 <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Button href="/sell/new">Start Selling</Button>
          <Button href="/pricing" variant="secondary">View Pricing</Button>
          <Button href="/waitlist" variant="secondary">Join Waitlist</Button>
        </div>
      </section>
    </div>
  );
}
