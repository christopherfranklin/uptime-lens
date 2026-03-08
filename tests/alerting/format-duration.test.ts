// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatDuration } from "../../worker/src/emails/templates";

describe("formatDuration", () => {
  it("formats 0ms as 0s", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("formats seconds correctly", () => {
    expect(formatDuration(5000)).toBe("5s");
  });

  it("formats exactly 1 minute", () => {
    expect(formatDuration(60000)).toBe("1m");
  });

  it("formats minutes correctly", () => {
    expect(formatDuration(720000)).toBe("12m");
  });

  it("formats 1 hour 0 minutes", () => {
    expect(formatDuration(3600000)).toBe("1h 0m");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(5400000)).toBe("1h 30m");
  });

  it("formats exactly 1 day", () => {
    expect(formatDuration(86400000)).toBe("1d 0h");
  });

  it("formats days and hours", () => {
    expect(formatDuration(90000000)).toBe("1d 1h");
  });
});
