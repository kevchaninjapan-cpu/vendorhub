export function nzd(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function area(value: number | null | undefined, unit = "m²"): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("en-NZ")} ${unit}`;
}

export function priceLabel(args: {
  method: string | null;
  askingPrice: number | null;
  priceText: string | null;
  beoAmount: number | null;
  tenderCloseAt: string | null;
}) {
  switch (args.method) {
    case "asking_price":
      return args.askingPrice != null ? nzd(args.askingPrice) : "Price by negotiation";
    case "beo":
      return args.beoAmount != null ? `BEO ${nzd(args.beoAmount)}` : "Buyer enquiry over";
    case "tender":
      return args.tenderCloseAt
        ? `Tender closes ${new Date(args.tenderCloseAt).toLocaleDateString("en-NZ")}`
        : "Tender";
    case "negotiation":
    default:
      return args.priceText ?? "Price by negotiation";
  }
}

export function summaryLine(b: number | null, ba: number | null, p: number | null) {
  const parts = [];
  if (b != null) parts.push(`${b} bed`);
  if (ba != null) parts.push(`${ba} bath`);
  if (p != null) parts.push(`${p} parking`);
  return parts.join(" · ");
}