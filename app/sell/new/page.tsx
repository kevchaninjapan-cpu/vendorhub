// app/sell/new/page.tsx
"use client";

import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";
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

type Plan = "starter" | "pro" | "elite";

const PLANS: Array<{
  id: Plan;
  name: string;
  tagline: string;
  priceOnce: string;
  priceMonthly: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
}> = [
  {
    id: "starter",
    name: "Starter Pack",
    tagline: "DIY confident seller",
    priceOnce: "$649",
    priceMonthly: "$49/mo",
    features: [
      "Listing toolkit + A–Z checklist",
      "Basic omni‑inbox",
      "Automation & lightweight CRM",
      "Property microsite",
      "Open home scheduler",
      "Marketing enablers + self‑serve support",
    ],
  },
  {
    id: "pro",
    name: "Pro Pack",
    tagline: "Do‑With‑You support",
    priceOnce: "$1,990",
    priceMonthly: "$99/mo",
    highlight: true,
    badge: "Most popular",
    features: [
      "Everything in Starter",
      "Automation + lead pipeline",
      "Creative collateral",
      "Floor plan import",
      "Paid social setup",
      "Distribution boost + open home integration",
    ],
  },
  {
    id: "elite",
    name: "Elite Pack",
    tagline: "Done‑For‑You service",
    priceOnce: "$3,990",
    priceMonthly: "$149/mo",
    features: [
      "Everything in Pro",
      "Advanced distribution",
      "Offer management",
      "Legal handoff",
      "Contract‑ready bundle",
      "Priority support",
    ],
  },
];

const ADD_ONS = [
  "Listing Concierge",
  "Social Media Advertising Concierge",
  "Professional photo bundle",
  "Open home hosting",
];

export default function SellNewPage() {
  const [selected, setSelected] = React.useState<Plan>("pro");

  // ✅ If your “create listing” route is different, change this one line:
  const nextHref = `/listings/create?plan=${selected}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-20">
        {/* Header */}
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Start selling with VendorHub
          </h1>
          <p className="mt-3 text-lg text-muted">
            Choose a package based on how hands‑on you want to be. You can
            upgrade anytime and add concierge services as needed.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((p) => {
            const active = p.id === selected;

            return (
              <Card
                key={p.id}
                className={cn(
                  "cursor-pointer transition",
                  active && "ring-2 ring-primary/20",
                  p.highlight && !active && "ring-1 ring-primary/10"
                )}
                onClick={() => setSelected(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(p.id);
                }}
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription>{p.tagline}</CardDescription>
                    </div>
                    {p.badge ? <Badge variant="default">{p.badge}</Badge> : null}
                  </div>

                  <div className="pt-1">
                    <div className="text-3xl font-bold">{p.priceOnce}</div>
                    <div className="mt-1 text-sm text-muted">
                      {p.priceMonthly}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2 text-sm text-muted">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-[2px] inline-block h-4 w-4 rounded-full border border-border/60 bg-surface" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "text-xs",
                      active ? "text-foreground" : "text-muted"
                    )}
                  >
                    {active ? "Selected" : "Select"}
                  </span>
                  <Button
                    variant={active ? "primary" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(p.id);
                    }}
                  >
                    {active ? "Selected" : "Choose"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Add-ons */}
        <div className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle>Optional add‑ons (any package)</CardTitle>
              <CardDescription>
                Add professional services when you want extra help — keep
                control, reduce admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ADD_ONS.map((a) => (
                  <Badge key={a} variant="subtle">
                    {a}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer actions */}
        <div className="mt-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Link href="/pricing">
            <Button variant="ghost" className="w-full sm:w-auto">
              View full pricing
            </Button>
          </Link>

          <Link href={nextHref}>
            <Button variant="primary" className="w-full sm:w-auto">
              Continue
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted">
          Tip: Start with Pro if you want structure and speed — you can upgrade
          or add concierge services later.
        </p>
      </div>
    </div>
  );
}