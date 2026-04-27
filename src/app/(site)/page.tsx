"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/* ================= helpers ================= */

function nzd(n: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
      {children}
    </div>
  );
}

/* ================= page ================= */

export default function Page() {
  const [calcOpen, setCalcOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // ✅ Dual state for salePrice — raw string for display, number for calc
  const [salePriceRaw, setSalePriceRaw] = useState("1200000");
  const [salePrice, setSalePrice] = useState(1_200_000);
  const [commissionPct, setCommissionPct] = useState(2.5);

  const agentFee = useMemo(
    () => salePrice * (commissionPct / 100),
    [salePrice, commissionPct]
  );

  const vendorHubCost = 1990;
  const savings = agentFee - vendorHubCost;

  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = calcOpen || isClosing ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [calcOpen, isClosing]);

  const requestClose = () => {
    if (!calcOpen || isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setIsClosing(false);
      setCalcOpen(false);
    }, 220);
  };

  useEffect(() => {
    if (!calcOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcOpen, isClosing]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main>
        {/* ================= HERO ================= */}
        <section className="mx-auto max-w-7xl px-6 pt-20 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-900">
              SELL PRIVATELY IN NZ
            </p>

            <h1 className="mt-3 text-5xl font-bold leading-tight">
              Take Control.
              <br />
              Save Thousands{" "}
              <span className="text-blue-600">in Agent Fees.</span>
            </h1>

            <p className="mt-5 max-w-xl text-slate-900">
              Traditional real estate agencies are static. Our engine is
              kinetic. Built for the modern Kiwi vendor who demands more
              control, transparency, and value from their selling experience.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                href="/onboarding/create"
                className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white"
              >
                Start Selling Now
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (closeTimerRef.current)
                    window.clearTimeout(closeTimerRef.current);
                  setIsClosing(false);
                  setCalcOpen(true);
                }}
                className="rounded-md border border-slate-200 px-6 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                Calculate savings
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border">
              <Image
                src="/images/hero-home.jpg"
                alt="Modern home"
                width={1200}
                height={800}
                className="object-cover"
                priority
              />
            </div>

            <div className="absolute -bottom-6 left-6 w-[260px] rounded-xl bg-white border p-4 shadow-lg">
              <p className="text-xs font-semibold text-slate-900">
                POTENTIAL SAVINGS
              </p>
              <p className="mt-1 text-xl font-bold">$18k–$40k+</p>
              <p className="mt-1 text-xs text-slate-900">
                Depending on sale price &amp; commission
              </p>
            </div>
          </div>
        </section>

        {/* ================= PERFORMANCE EDGE ================= */}
        <section id="features" className="mx-auto max-w-7xl px-6 pt-28">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold">The Performance Edge</h2>
              <p className="mt-2 max-w-2xl text-slate-900">
                A seller‑first toolkit built to remove agent overhead without
                removing structure or discipline.
              </p>
            </div>
            <div className="hidden sm:block text-slate-200 font-semibold">
              V‑HUB/04
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <div className="rounded-xl border p-6">
                <IconBox>💰</IconBox>
                <h3 className="mt-4 font-semibold">Maximise Savings</h3>
                <p className="mt-2 text-sm text-slate-900">
                  Replace 2–5% commissions with a predictable, transparent cost.
                </p>
              </div>

              <div className="rounded-xl border p-6">
                <IconBox>🔍</IconBox>
                <h3 className="mt-4 font-semibold">Complete Transparency</h3>
                <p className="mt-2 text-sm text-slate-900">
                  Real time tracking of leads, views and pricing data at your
                  fingertips.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-blue-600 p-8 text-white">
              <IconBox>🧠</IconBox>
              <h3 className="mt-4 font-semibold">Total DIY Control</h3>
              <p className="mt-2 text-sm text-white/80">
                You control price, timing, open homes, and negotiation without
                relying on agents.
              </p>
            </div>

            <div className="flex items-end">
              <div className="rounded-xl border p-6 w-full">
                <IconBox>⚙️</IconBox>
                <h3 className="mt-4 font-semibold">Automated Intelligence</h3>
                <p className="mt-2 text-sm text-slate-900">
                  Auto‑replies, reminders, and prompts keep buyers moving.
                  Receive offers from buyers, counter offers, and close deals
                  with our secure, encrypted platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SEQUENCE OF SALE ================= */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-6 pt-28">
          <h2 className="text-3xl font-bold text-center">
            The Sequence of Sale
          </h2>
          <p className="mt-3 text-center text-slate-900 max-w-2xl mx-auto">
            A guided flow from preparation to close built specifically for
            private sellers.
          </p>

          <div className="mt-16 space-y-12">
            {[
              {
                n: "01",
                title: "Estimate Savings",
                desc: "Use our savings calculator to see how much you could save by selling privately with VendorHub.",
              },
              {
                n: "02",
                title: "Set Up your listing once",
                desc: "Create your listing, upload documents, and prepare marketing assets with structured guidance. We can syndicate to Trade Me, realestate.co.nz, HouGarden and Social Media channels.",
              },
              {
                n: "03",
                title: "Manage Enquiries",
                desc: "Our kinetic hub filters buyer enquiries, lets you schedule open homes and manages leads through intelligent automation via a centralised omni-inbox.",
              },
              {
                n: "04",
                title: "Convert & Close",
                desc: "Receive digital offers, compare terms and finalise sales and purchase contracts through our secure, encrypted platform. We can help you settle and handover smoothly and quickly.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="grid gap-8 lg:grid-cols-2 items-center">
                <div>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-bold text-blue-600">
                      {n}
                    </span>
                    <h3 className="text-xl font-semibold">{title}</h3>
                  </div>
                  <p className="mt-4 max-w-md text-slate-900">{desc}</p>
                </div>
                <div className="h-40 rounded-xl border bg-slate-100" />
              </div>
            ))}
          </div>
        </section>

        {/* ================= CTA FOOTER ================= */}
        <section className="mt-32 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-20 text-center text-white">
            <h2 className="text-4xl font-bold">Initialize Your Sale</h2>
            <p className="mt-4 text-white/70">
              Start with the basics, upgrade if you want us to do it with you
              or do it for you.
            </p>
            <div className="mt-8">
              <Link
                href="/onboarding/create"
                className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white"
              >
                Start Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ================= CALCULATOR OVERLAY ================= */}
      {(calcOpen || isClosing) && (
        <div className="fixed inset-0 z-50">
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${
              isClosing ? "animate-vh-fade-out" : "animate-vh-fade-in"
            }`}
            onClick={requestClose}
          />

          <aside
            className={`absolute right-0 top-0 h-full w-full max-w-[760px] bg-white shadow-2xl ${
              isClosing ? "animate-vh-slide-out" : "animate-vh-slide-in"
            }`}
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget) return;
              if (isClosing) {
                if (closeTimerRef.current)
                  window.clearTimeout(closeTimerRef.current);
                setIsClosing(false);
                setCalcOpen(false);
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Savings calculator"
          >
            <div className="flex h-full flex-col overflow-y-auto p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Calculate your{" "}
                    <span className="text-blue-600">Performance Edge</span>
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-slate-900">
                    Predictive metrics for elite vendors. Compare traditional
                    agency pricing against the streamlined efficiency of
                    VendorHub NZ.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={requestClose}
                  className="text-slate-900 hover:text-slate-800"
                  aria-label="Close calculator"
                >
                  ✕
                </button>
              </div>

              <div className="mt-10 grid gap-8 lg:grid-cols-2">
                {/* LEFT: Inputs */}
                <div className="space-y-6">
                  {/* ✅ Target Asset Value — no leading zeros */}
                  <div className="rounded-xl border p-6">
                    <p className="text-xs font-semibold tracking-widest text-slate-900">
                      ESTIMATED PROPERTY VALUE
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={salePriceRaw}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        const stripped =
                          digits.replace(/^0+(?=\d)/, "") || "0";
                        setSalePriceRaw(stripped);
                        setSalePrice(Number(stripped));
                      }}
                      onBlur={() => {
                        if (!salePriceRaw || salePriceRaw === "0") {
                          setSalePriceRaw("0");
                          setSalePrice(0);
                        }
                      }}
                      className="mt-3 w-full text-2xl font-bold outline-none"
                    />
                  </div>

                  <div className="rounded-xl border p-6">
                    <p className="text-xs font-semibold tracking-widest text-slate-900">
                      AGENT COMMISSION %
                    </p>
                    <input
                      type="number"
                      step={0.1}
                      value={commissionPct}
                      onChange={(e) =>
                        setCommissionPct(Number(e.target.value || 0))
                      }
                      className="mt-3 w-full text-2xl font-bold outline-none"
                    />
                  </div>

                  <div className="rounded-xl border p-6 space-y-4">
                    <p className="text-xs font-semibold tracking-widest text-slate-900">
                      VENDORHUB PACKAGE
                    </p>

                    {[
                      { label: "Elite Pack", price: 6995 },
                      { label: "Pro Pack", price: 3495 },
                      { label: "Starter Pack", price: 649 },
                    ].map((p) => (
                      <label
                        key={p.label}
                        className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-slate-50"
                      >
                        <span className="font-semibold">{p.label}</span>
                        <span className="text-blue-600 font-semibold">
                          {nzd(p.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Results */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white">
                  <p className="text-xs font-semibold tracking-widest text-white/70">
                    TOTAL POTENTIAL SAVINGS
                  </p>

                  <p
                    className={`mt-4 text-5xl font-bold ${
                      isClosing ? "" : "animate-vh-fade-in"
                    }`}
                    style={
                      isClosing ? undefined : { animationDelay: "250ms" }
                    }
                  >
                    {nzd(savings)}
                  </p>

                  <p className="mt-2 text-sm text-white/70">
                    Calculated against standard {commissionPct}% traditional
                    commission.
                  </p>

                  <div className="mt-6 h-2 w-full rounded bg-white/20">
                    <div
                      className="h-2 rounded bg-white"
                      style={{ width: "65%" }}
                    />
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-white/10 p-4">
                      <p className="text-xs text-white/70">Traditional route</p>
                      <p className="mt-1 font-semibold">{nzd(agentFee)}</p>
                    </div>

                    <div className="rounded-lg bg-white p-4 text-blue-700">
                      <p className="text-xs text-blue-700/70">
                        VendorHub route
                      </p>
                      <p className="mt-1 font-semibold">{nzd(vendorHubCost)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem(
                        "vh_savings",
                        JSON.stringify({ salePrice, agentFee, savings })
                      );
                      window.location.href = "/onboarding/create";
                    }}
                    className="mt-8 w-full rounded-md bg-white px-6 py-4 text-center font-semibold text-blue-700 hover:bg-white/90"
                  >
                    Claim your savings →
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}