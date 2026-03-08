import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[worker] RESEND_API_KEY not set -- emails will not be sent");
      return null;
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/** Reset cached client -- for testing only. */
export function _resetClient(): void {
  _resend = null;
}

export async function sendAlertEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;

    const { error } = await resend.emails.send({
      from: "Uptime Lens <alerts@uptimelens.io>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[worker] Email send error:", error.message);
    }
  } catch (err) {
    console.error("[worker] Email send failed:", err);
    // Don't throw -- email failures should not crash the check loop
  }
}
