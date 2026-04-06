// app/pricing/page.tsx
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "@/components/ui";

export default function PricingPage() {
  return (
    <div className="bg-background pb-24">
      {/* Pricing Header */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Simple, fair pricing.
        </h1>
        <p className="mt-4 text-lg text-muted max-w-2xl mx-auto">
          Choose the tools you need to sell privately — and nothing you don’t.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* STARTER */}
        <Card>
          <CardHeader>
            <CardTitle>Starter Pack</CardTitle>
            <CardDescription>Do it yourself</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <div className="text-3xl font-bold text-foreground">$649</div>
              <div className="text-sm text-muted mt-1">One‑off + optional add‑ons</div>
            </div>

            <ul className="space-y-2 text-sm text-muted">
              <li>• A–Z Listing Toolkit</li>
              <li>• Basic Omni Inbox</li>
              <li>• Property listing on VendorHub</li>
              <li>• Marketing assistant, tutorials & email support</li>
            </ul>
          </CardContent>

          <CardFooter>
            <Link href="/sell/new" className="w-full">
              <Button variant="primary" className="w-full">
                Start Selling
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* PRO */}
        <Card className="ring-2 ring-primary/20">
          <CardHeader>
            <CardTitle>Pro Pack</CardTitle>
            <CardDescription>Do it with us</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <div className="text-3xl font-bold text-foreground">$1,990</div>
              <div className="text-sm text-muted mt-1">One‑off + monthly tools</div>
            </div>

            <ul className="space-y-2 text-sm text-muted">
              <li>• Everything in Starter</li>
              <li>• Fully automated Omni Inbox & lead pipelines</li>
              <li>• Priority enquiry alerts</li>
              <li>• Open home scheduling</li>
              <li>• Vendor‑branded marketing kit</li>
              <li>• Negotiation workspace</li>
              <li>• Email alias routing</li>
            </ul>
          </CardContent>

          <CardFooter>
            <Link href="/sell/new" className="w-full">
              <Button variant="outline" className="w-full">
                Choose Pro
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* ELITE */}
        <Card>
          <CardHeader>
            <CardTitle>Elite Pack</CardTitle>
            <CardDescription>Do it for me</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <div className="text-3xl font-bold text-foreground">$3,990</div>
              <div className="text-sm text-muted mt-1">Done‑for‑you experience</div>
            </div>

            <ul className="space-y-2 text-sm text-muted">
              <li>• Everything in Pro</li>
              <li>• Offer management & negotiation support</li>
              <li>• Contract‑ready bundle</li>
              <li>• Priority support via WhatsApp</li>
            </ul>
          </CardContent>

          <CardFooter>
            <Link href="/sell/new" className="w-full">
              <Button variant="outline" className="w-full">
                Go Elite
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}