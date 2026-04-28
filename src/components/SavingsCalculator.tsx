"use client";

import { useMemo, useState } from "react";

type TierKey = "starter" | "pro" | "elite";

type Tier = {
  key: TierKey;
  name: string;
  upfront: number;
  monthly: number;
  months: number;
};

const TIERS: Tier[] = [
  { key: "starter", name: "Starter Pack", upfront: 649, monthly: 49, months: 2 },
  { key: "pro", name: "Pro Pack", upfront: 3990, monthly: 99, months: 2 },
  { key: "elite", name: "Elite Pack", upfront: 6495, monthly: 149, months: 2 },
];

const nzd = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function SavingsCalculator() {
  const [propertyValue, setPropertyValue] = useState(1_500_000);
  const [commissionPct, setCommissionPct] = useState(5.0);
  const [marketingBudget, setMarketingBudget] = useState(5_000);
  const [legalFees, setLegalFees] = useState(2_500);
  const [tierKey, setTierKey] = useState<TierKey>("elite");

  const tier = useMemo(
    () => TIERS.find((t) => t.key === tierKey)!,
    [tierKey]
  );

  const result = useMemo(() => {
    const pv = clamp(propertyValue, 200_000, 10_000_000);
    const commission = clamp(commissionPct, 0, 6) / 100;

    const traditionalCommission = pv * commission;
    const traditionalTotal =
      traditionalCommission + marketingBudget + legalFees;

    const vendorhubFee = tier.upfront + tier.monthly * tier.months;
    const vendorhubTotal =
      vendorhubFee + marketingBudget + legalFees;

    const savings = Math.max(0, traditionalTotal - vendorhubTotal);

    return {
      traditionalCommission,
      traditionalTotal,
      vendorhubFee,
      vendorhubTotal,
      savings,
    };
  }, [
    propertyValue,
    commissionPct,
    marketingBudget,
    legalFees,
    tier,
  ]);

  return (
    <section className="w-full bg-gradient-to-b from-white to-slate-50 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Commission is a legacy cost.
        </h2>
        <p className="mt-3 max-w-3xl text-slate-900">
          Quantify what you could retain by using VendorHub instead of the
          traditional commission model.
        </p>

        {/* Comparison */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card title="The traditional model">
            <Row
              label={`${commissionPct.toFixed(1)}% Agent commission`}
              value={nzd.format(result.traditionalCommission)}
            />
            <Row label="Marketing costs" value={nzd.format(marketingBudget)} />
            <Row label="Legal & compliance" value={nzd.format(legalFees)} />
            <Divider />
            <RowTotal
              label="Total cost to sell"
              value={nzd.format(result.traditionalTotal)}
            />
          </Card>

          <Card title="The VendorHub way" dark badge={tier.name}>
            <RowDark
              label="VendorHub Package Cost"
              value={nzd.format(result.vendorhubFee)}
            />
            <RowDark label="Marketing costs" value={nzd.format(marketingBudget)} />
            <RowDark label="Legal & compliance" value={nzd.format(legalFees)} />
            <Divider dark />
            <RowTotalDark
              label="Total cost to sell"
              value={nzd.format(result.vendorhubTotal)}
            />
          </Card>
        </div>

        {/* Inputs + Summary */}
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          {/* Inputs */}
          <div className="lg:col-span-7 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-semibold">Quantify your savings in seconds.</h3>
            <p className="mt-1 text-sm text-slate-900">
              Enter your information below to see how much you can save.
            </p>

            {/* Retained equity callout */}
            <div className="mt-5 rounded-2xl bg-blue-50 px-5 py-4 ring-1 ring-blue-100">
              <div className="text-xs font-semibold uppercase text-blue-700">
                Potential retained equity
              </div>
              <div className="mt-1 text-3xl font-semibold text-blue-700 md:text-4xl">
                {nzd.format(result.savings)}
              </div>
              <p className="mt-1 text-xs text-blue-700/80">
                Illustrative only — depends on price, fees, and time to sell.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <Slider
                label="Property value"
                value={propertyValue}
                min={200_000}
                max={5_000_000}
                step={10_000}
                onChange={setPropertyValue}
                display={nzd.format(propertyValue)}
              />
              <Slider
                label="Agent commission (%)"
                value={commissionPct}
                min={0}
                max={6}
                step={0.1}
                onChange={setCommissionPct}
                display={`${commissionPct.toFixed(1)}%`}
              />
              <Slider
                label="Marketing budget"
                value={marketingBudget}
                min={0}
                max={20_000}
                step={250}
                onChange={setMarketingBudget}
                display={nzd.format(marketingBudget)}
              />
              <Slider
                label="Legal fees"
                value={legalFees}
                min={0}
                max={10_000}
                step={100}
                onChange={setLegalFees}
                display={nzd.format(legalFees)}
              />

              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-slate-900">
                  Select your service tier
                </div>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={tierKey}
                  onChange={(e) =>
                    setTierKey(e.target.value as TierKey)
                  }
                >
                  {TIERS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name} ({nzd.format(t.upfront)} +{" "}
                      {nzd.format(t.monthly)}/mo)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-semibold">Summary</h3>

            <div className="mt-6 space-y-4">
              <Row
                label="Traditional total"
                value={nzd.format(result.traditionalTotal)}
              />
              <Row
                label="VendorHub total"
                value={nzd.format(result.vendorhubTotal)}
              />
              <Divider />
              {/* ✅ BIGGER TEXT HERE */}
              <RowTotal
                label="Estimated savings"
                value={nzd.format(result.savings)}
                highlight
                size="xl"
              />
            </div>

            <a
              href="/learn-more"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- UI helpers ---------- */

function Card({
  title,
  children,
  dark,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  dark?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-6 shadow-sm ring-1 ${
        dark
          ? "bg-slate-900 text-white ring-slate-800"
          : "bg-white ring-slate-200"
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase">
        <span>{title}</span>
        {badge && (
          <span className="rounded-full bg-blue-600/20 px-3 py-1 text-blue-200">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Divider({ dark }: { dark?: boolean }) {
  return (
    <div
      className={`border-t ${
        dark ? "border-slate-700" : "border-slate-200"
      } pt-4`}
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-900">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function RowDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function RowTotal({
  label,
  value,
  highlight,
  size = "normal",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  size?: "normal" | "large" | "xl";
}) {
  const sizeClass =
    size === "xl"
      ? "text-3xl md:text-4xl"
      : size === "large"
      ? "text-2xl"
      : "text-base";

  return (
    <div className="flex items-center justify-between">
      <span className="font-semibold">{label}</span>
      <span
        className={`font-semibold ${sizeClass} ${
          highlight ? "text-blue-600" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function RowTotalDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between font-semibold">
      <span>{label}</span>
      <span className="text-blue-300">{value}</span>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold uppercase text-slate-900">
        <span>{label}</span>
        <span className="text-slate-900">{display}</span>
      </div>
      <input
        type="range"
        className="mt-2 w-full accent-blue-600"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}