export type UploadedDoc = {
  id: string;
  label: string; // e.g. "Business License"
  status: "uploaded" | "missing" | "required";
  helper?: string; // e.g. "Required for full verification"
};

export type OnboardingProfile = {
  fullName: string;
  officialEmail: string;
  businessPhone: string;
  taxIdMasked: string;
  registeredAddress: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  uploadedDocuments: UploadedDoc[];
};

const KEY = "vendorhub:onboarding:profile";

const defaultProfile: OnboardingProfile = {
  fullName: "Alexander Sterling-Vane",
  officialEmail: "a.sterling@vane-enterprises.com",
  businessPhone: "+1 (555) 892-0441",
  taxIdMasked: "XX-XXX4910",
  registeredAddress: {
    line1: "4320 Mayfair Pizza",
    line2: "Suite 900, Kensington",
    city: "London, W8 4HX",
    postcode: "",
    country: "United Kingdom",
  },
  uploadedDocuments: [
    { id: "biz", label: "Business License", status: "uploaded" },
    { id: "idv", label: "ID Verification (Passport / Driver License)", status: "uploaded" },
    { id: "tax", label: "Tax Certificate", status: "required", helper: "Required for full verification" },
  ],
};

export function loadOnboardingProfile(): OnboardingProfile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw) as OnboardingProfile;
    return {
      ...defaultProfile,
      ...parsed,
      registeredAddress: { ...defaultProfile.registeredAddress, ...(parsed.registeredAddress ?? {}) },
      uploadedDocuments: Array.isArray(parsed.uploadedDocuments)
        ? parsed.uploadedDocuments
        : defaultProfile.uploadedDocuments,
    };
  } catch {
    return defaultProfile;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

/**
 * This is the routing rule you asked for:
 * - if user submitted any verification docs -> /onboarding/submitted
 * - if they didn't -> /onboarding/success
 */
export function nextRouteAfterSubmit(profile: OnboardingProfile) {
  const hasAnyDocs = (profile.uploadedDocuments ?? []).some((d) => d.status === "uploaded");
  return hasAnyDocs ? "/onboarding/submitted" : "/onboarding/success";
}