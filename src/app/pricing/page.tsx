// src/app/pricing/page.tsx
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="text-slate-900">
          Choose the tier that fits how hands-on you want to be.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Starter */}
        <Card>
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>DIY confident sellers</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-semibold">$649</div>
            <div className="text-sm text-slate-900">+ $49/mo</div>
          </CardContent>

          <CardFooter>
            <Link href="/app">
              <Button className="w-full">Get started</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Pro */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pro</CardTitle>
              <Badge>Popular</Badge>
            </div>
            <CardDescription>Do‑With‑You support</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-semibold">$3,990</div>
            <div className="text-sm text-slate-900">+ $99/mo</div>
          </CardContent>

          <CardFooter>
            <Link href="/app">
              <Button className="w-full">Get started</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Elite */}
        <Card>
          <CardHeader>
            <CardTitle>Elite</CardTitle>
            <CardDescription>Done‑For‑You</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-semibold">$6,495</div>
            <div className="text-sm text-slate-900">+ $149/mo</div>
          </CardContent>

          <CardFooter>
            <Link href="/app">
              <Button className="w-full">Get started</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="pt-4 text-center">
        <Link href="/app">
          <Button >Start listing</Button>
        </Link>
      </div>
    </div>
  );
}
``