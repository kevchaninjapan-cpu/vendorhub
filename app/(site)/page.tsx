// app/(site)/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SiteHomePage() {
  return (
    <main className="bg-[#f9f9fb] text-slate-900">
      {/* ===================== */}
      {/* HERO */}
      {/* ===================== */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-28 lg:grid lg:grid-cols-2 lg:gap-16 lg:pt-28 lg:pb-36">
          {/* Left */}
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Private sales reimagined
            </span>

            <h1 className="mt-6 text-[2.75rem] leading-tight font-semibold tracking-tight sm:text-5xl">
              The Luxury of
              <span className="block text-blue-600">Selling Direct.</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              VendorHub is the smart system for private sellers.
              Where homeowners sell with precision.
            </p>

            {/* CTAs */}
            <div className="mt-12 flex flex-wrap items-center gap-5">
              <Link href="/listings/create">
                <Button size="lg" className="px-8 rounded-xl">
                  Start listing
                </Button>
              </Link>

              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 rounded-xl border-slate-300 text-slate-700"
                >
                  View pricing
                </Button>
              </Link>
            </div>
          </div>

          {/* Right */}
          <div className="relative mt-16 lg:mt-0">
            {/* Image container */}
            <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden rounded-2xl shadow-[0_40px_80px_-40px_rgba(0,0,0,0.25)]">
              <Image
                src="/images/hero-home.jpg"
                alt="Luxury residence"
                fill
                priority
                className="object-cover"
              />

              {/* Gradient overlay (editorial, very subtle) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/0 to-black/0" />
            </div>

            {/* Proof chip */}
            <div className="absolute bottom-6 left-6 max-w-xs rounded-xl bg-white/90 px-4 py-3 text-sm text-slate-700 backdrop-blur">
              <div className="font-medium">Verified private listing</div>
              <div className="text-slate-500">
                Our listings are ready to buy - no agents, no fees, no hassle.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* SECTION: POSITIONING */}
      {/* ===================== */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight">
            Your listing, engineered for success.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Everything you expect from a premium agency — without the pressure,
            noise, or commission structure.
          </p>
        </div>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-lg font-medium">Smart support for the modern home seller.</h3>
            <p className="mt-2 text-slate-600">
              Property valuation, listing optimisation, negotiation tools and marketing strategy 
              designed to maximise your sale — without the agency fees.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium">The premium way to sell your home privately. </h3>
            <p className="mt-2 text-slate-600">
              Decide how much help you need, and how much control you want. 
              VendorHub gives you the tools to sell on your terms, while keeping 100% of the sale price.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium">Clarity confidence and cutting edge tools.</h3>
            <p className="mt-2 text-slate-600">
              From enquiries, open homes,contracts and closing, VendorHub coordinates the process
              end‑to‑end, on your terms.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}