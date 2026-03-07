import { describe, test } from "vitest";

describe("Magic Link Auth Config", () => {
  test.todo("auth exports a configured Better Auth instance");
  test.todo("magic link plugin is included in auth config");
  test.todo("magic link expiry is set to 600 seconds (10 minutes)");
  test.todo("sendMagicLink callback calls resend.emails.send without await");
});
