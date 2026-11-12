// Removes secrets from anything sent to Sentry.
//
// VendorHub hands out short-lived signed URLs for listing documents (LIMs,
// titles) and uploads. The token is in the URL, so if an error happened on
// one of those requests, the full URL would otherwise reach Sentry and
// anyone with Sentry access could open the document until the link expires.

const RULES: Array<[RegExp, string]> = [
  // Supabase storage signed/upload URLs: drop the whole query string.
  [/(\/storage\/v1\/(?:object|upload)\/[^\s"'?#]*)\?[^\s"'#]*/g, "$1?[Filtered]"],
  // Token-like query or form parameters anywhere.
  [
    /((?:^|[?&#;\s"'])(?:token|access_token|refresh_token|id_token|code|sig|signature|apikey|api_key|key|x-amz-signature|x-amz-credential)=)[^&#\s"']+/gi,
    "$1[Filtered]",
  ],
  // JWTs (Supabase session tokens, legacy service key).
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[Filtered JWT]"],
  // Supabase secret keys and Resend API keys.
  [/sb_secret_[A-Za-z0-9_-]{8,}/g, "[Filtered key]"],
  [/\bre_[A-Za-z0-9]{6,}_[A-Za-z0-9]{12,}/g, "[Filtered key]"],
];

export function scrubString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement);
  return out;
}

// Walks an event, breadcrumb or span and scrubs every string in it.
export function scrubDeep<T>(value: T, depth = 0): T {
  if (value == null || depth > 12) return value;
  if (typeof value === "string") return scrubString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1)) as unknown as T;
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value; // leave class instances alone
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubDeep(v, depth + 1);
    }
    return out as T;
  }
  return value;
}