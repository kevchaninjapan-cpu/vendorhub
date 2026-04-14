"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type DocType = "bank" | "utility" | "government";

export default function OnboardingIdentityPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType | null>(null);

  const canComplete = !!file && !!docType;

  // ✅ MINIMAL GUARD
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // User clicked email verification but has no active session
        router.replace("/onboarding/details");
      }
    });
  }, [router, supabase]);

    return (
      <main className="min-h-screen bg-slate-50">
        <div>Onboarding Details</div>
      </main>
    );
  }
