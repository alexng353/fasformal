import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || "FAS Formal <noreply@fasformal.com>";

export async function sendEmail(to: string, subject: string, body: string) {
  if (!resend) {
    console.log(`[EMAIL STUB] To: ${to}`);
    console.log(`[EMAIL STUB] Subject: ${subject}`);
    console.log(`[EMAIL STUB] Body: ${body}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html: body,
  });

  if (error) {
    console.error("[EMAIL] Failed to send:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
