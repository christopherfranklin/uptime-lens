import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { resend } from "@/lib/email/resend";
import MagicLinkEmail from "@/lib/email/templates/magic-link";
import EmailChangeEmail from "@/lib/email/templates/email-change";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day sliding window
  },
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void resend.emails.send({
        from: "Uptime Lens <login@uptimelens.io>",
        to: user.email,
        subject: "Verify your new email for Uptime Lens",
        react: EmailChangeEmail({ url }),
      });
    },
  },
  plugins: [
    magicLink({
      expiresIn: 600, // 10 minutes
      sendMagicLink: async ({ email, url }) => {
        void resend.emails.send({
          from: "Uptime Lens <login@uptimelens.io>",
          to: email,
          subject: "Sign in to Uptime Lens",
          react: MagicLinkEmail({ url }),
        });
      },
    }),
    nextCookies(), // MUST be last plugin
  ],
});
