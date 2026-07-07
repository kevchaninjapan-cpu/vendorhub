import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(args: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return { skipped: true };
  }
  const from = process.env.EMAIL_FROM ?? "VendorHub <[email protected]>";
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    react: args.react,
  });
  if (error) console.error("[email] send failed:", error);
  return { ok: !error };
}
