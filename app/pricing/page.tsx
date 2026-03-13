import Card from "@/components/Card";
import Button from "@/components/Button";

export default function PricingPage() {
  return (
    <div className="bg-white pb-24">
      {/* Pricing Header */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Simple, fair pricing.
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the tools you need to sell privately — and nothing you don’t.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* GOOD */}
        <Card
          title="Starter Pack: Do it Yourself"
          price="$649"
          features={[
            "A-Z Listing Toolkit",
            "Basic Omni Inbox",
            "Property listing on VendorHub",
            "Marketing Assistant, Tutorials and Email support"
          ]}
        >
          <Button href="/sell/new">Start Selling</Button>
        </Card>

        {/* BETTER */}
        <Card
          title="Pro Pack: Do it with us"
          price="$1990"
          highlight
          features={[
            "Everything in Starter Pack",
            "Fully automated Omni Inbox with lead pipelines",
            "Priority inquiry alerts",
            "Open home scheduling integration",
            "Vendor-branded marketing kit",
            "Negotiation workspace",
            "Email alias routing"
          ]}
        >
          <Button href="/pricing">Buy Enhanced</Button>
        </Card>

        {/* BEST */}
        <Card
          title="Elite Pack: Do it for me"
          price="$3990"
          features={[
            "Everything in Enhanced",
            "Offer management and negotiation support",
            "Contract ready bundle",
            "Priority support via Whatsapp"
          ]}
        >
          <Button href="/pricing">Buy Professional</Button>
        </Card>
      </section>
    </div>
  );
}