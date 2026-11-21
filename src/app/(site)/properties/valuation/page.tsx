import { permanentRedirect } from "next/navigation";

// The valuation tool now lives at /valuation. Kept so old links still work.
export default function PropertiesValuationRedirect() {
  permanentRedirect("/valuation");
}
