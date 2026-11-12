// Sentry in the browser. Hardened: see src/lib/sentry-scrub.ts.
//
// Session Replay is deliberately NOT enabled. It records the screen, and
// VendorHub screens show names, addresses and identity documents.
import * as Sentry from "@sentry/nextjs";
import { scrubDeep } from "./lib/sentry-scrub";

Sentry.init({
  dsn: "https://f6f15a5ad9f4a5f021c43402b9c7225d@o4512325804163072.ingest.de.sentry.io/4512325822120016",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Collect as little as possible. An empty dataCollection object would turn
  // every category ON, so each one is switched off explicitly.
  dataCollection: {
    userInfo: false,           // no IP addresses or user identifiers
    cookies: false,            // no session cookies
    httpHeaders: false,        // no request headers (Referer can hold signed URLs)
    urlQueryParams: false,      // no query strings (signed-URL tokens)
    httpBodies: [],            // no request bodies (offers, profile details)
  },

  beforeSend: (event) => scrubDeep(event),
  beforeSendTransaction: (event) => scrubDeep(event),
  beforeBreadcrumb: (breadcrumb) => scrubDeep(breadcrumb),});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;