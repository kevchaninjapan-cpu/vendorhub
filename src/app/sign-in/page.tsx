import { redirect } from "next/navigation";

// Old sign-in address. Kept so existing links and emails still work.
// Sends people to /signin and keeps ?redirect= / ?next=.
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OldSignInRedirect({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const query = qs.toString();
  redirect(query ? `/signin?${query}` : "/signin");
}