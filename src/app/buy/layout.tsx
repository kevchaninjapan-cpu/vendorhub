import SiteFooter from "@/components/SiteFooter";

// Adds the shared footer (copyright, terms and the LINZ credit) to these pages.
export default function FooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}