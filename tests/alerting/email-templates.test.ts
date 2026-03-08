// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  downtimeEmailHtml,
  recoveryEmailHtml,
  sslExpiryEmailHtml,
  weeklyDigestEmailHtml,
} from "../../worker/src/emails/templates";

describe("downtimeEmailHtml", () => {
  const html = downtimeEmailHtml({
    monitorName: "My API",
    url: "https://api.example.com",
    cause: "HTTP 502",
    detectedAt: "2026-03-08 10:00 UTC",
    dashboardUrl: "https://uptimelens.io/dashboard",
  });

  it("contains Monitor Down heading", () => {
    expect(html).toContain("Monitor Down");
  });

  it("contains the monitor name", () => {
    expect(html).toContain("My API");
  });

  it("contains the URL", () => {
    expect(html).toContain("https://api.example.com");
  });

  it("contains the cause", () => {
    expect(html).toContain("HTTP 502");
  });

  it("contains the detected time", () => {
    expect(html).toContain("2026-03-08 10:00 UTC");
  });

  it("contains red border color", () => {
    expect(html).toContain("#ef4444");
  });

  it("contains View Monitor link", () => {
    expect(html).toContain("View Monitor");
    expect(html).toContain("https://uptimelens.io/dashboard");
  });
});

describe("recoveryEmailHtml", () => {
  const html = recoveryEmailHtml({
    monitorName: "My API",
    url: "https://api.example.com",
    downtimeDuration: "12m",
    recoveredAt: "2026-03-08 10:12 UTC",
    dashboardUrl: "https://uptimelens.io/dashboard",
  });

  it("contains Monitor Recovered heading", () => {
    expect(html).toContain("Monitor Recovered");
  });

  it("contains the monitor name", () => {
    expect(html).toContain("My API");
  });

  it("contains the downtime duration", () => {
    expect(html).toContain("12m");
  });

  it("contains green border color", () => {
    expect(html).toContain("#22c55e");
  });

  it("contains View Monitor link", () => {
    expect(html).toContain("View Monitor");
    expect(html).toContain("https://uptimelens.io/dashboard");
  });
});

describe("sslExpiryEmailHtml", () => {
  const html = sslExpiryEmailHtml({
    monitorName: "My Site",
    url: "https://example.com",
    daysUntilExpiry: 14,
    expiryDate: "2026-03-22",
    dashboardUrl: "https://uptimelens.io/dashboard",
  });

  it("contains SSL Certificate heading", () => {
    expect(html).toContain("SSL Certificate");
  });

  it("contains the monitor name", () => {
    expect(html).toContain("My Site");
  });

  it("contains the days value", () => {
    expect(html).toContain("14");
  });

  it("contains amber border color", () => {
    expect(html).toContain("#f59e0b");
  });

  it("contains View Monitor link", () => {
    expect(html).toContain("View Monitor");
    expect(html).toContain("https://uptimelens.io/dashboard");
  });
});

describe("weeklyDigestEmailHtml", () => {
  const html = weeklyDigestEmailHtml({
    monitors: [
      { name: "API", uptimePercentage: 99.95 },
      { name: "Website", uptimePercentage: 100 },
    ],
    incidents: [
      { monitorName: "API", duration: "12m", cause: "HTTP 502" },
    ],
    weekStart: "Mar 1",
    weekEnd: "Mar 7",
  });

  it("contains Weekly Uptime Digest heading", () => {
    expect(html).toContain("Weekly Uptime Digest");
  });

  it("contains monitor names", () => {
    expect(html).toContain("API");
    expect(html).toContain("Website");
  });

  it("contains uptime percentages", () => {
    expect(html).toContain("99.95");
    expect(html).toContain("100");
  });

  it("contains incident entries", () => {
    expect(html).toContain("HTTP 502");
    expect(html).toContain("12m");
  });
});

describe("emailWrapper (via template output)", () => {
  const html = downtimeEmailHtml({
    monitorName: "Test",
    url: "https://test.com",
    cause: "Timeout",
    detectedAt: "now",
    dashboardUrl: "https://uptimelens.io/dashboard",
  });

  it("is valid HTML (starts with DOCTYPE)", () => {
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("contains body tag", () => {
    expect(html).toContain("<body");
  });

  it("contains UL logo text", () => {
    expect(html).toContain("UL");
  });

  it("uses inline styles only (no style blocks)", () => {
    expect(html).not.toMatch(/<style[\s>]/);
  });
});
