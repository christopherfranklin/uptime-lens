import { NextResponse } from "next/server";
import { resend } from "@/lib/email/resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'to' email address" },
        { status: 400 },
      );
    }

    const { data, error } = await resend.emails.send({
      from: "Uptime Lens <alerts@uptimelens.io>",
      to,
      subject: "Test email from Uptime Lens",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;">
            Email Infrastructure Verified
          </h1>
          <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
            This confirms that your Uptime Lens email infrastructure is working correctly.
            Alert notifications and magic link authentication emails will be sent from this address.
          </p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #71717a; margin: 0;">
              <strong>SPF/DKIM/DMARC:</strong> Ensure your DNS records are configured for
              uptimelens.io to guarantee email deliverability. Check your Resend dashboard
              for domain verification status.
            </p>
          </div>
          <p style="font-size: 14px; color: #a1a1aa;">
            &mdash; Uptime Lens
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
