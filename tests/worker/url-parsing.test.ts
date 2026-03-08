// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseTcpTarget, parseHostname } from "../../worker/src/probes/url";

describe("parseTcpTarget", () => {
  it('parses tcp://host:8080 correctly', () => {
    const result = parseTcpTarget("tcp://host:8080");
    expect(result).toEqual({ host: "host", port: 8080 });
  });

  it('parses example.com:3306 correctly', () => {
    const result = parseTcpTarget("example.com:3306");
    expect(result).toEqual({ host: "example.com", port: 3306 });
  });

  it('parses http://example.com:8080 correctly', () => {
    const result = parseTcpTarget("http://example.com:8080");
    expect(result).toEqual({ host: "example.com", port: 8080 });
  });

  it('defaults to port 80 for bare hostname', () => {
    const result = parseTcpTarget("example.com");
    expect(result).toEqual({ host: "example.com", port: 80 });
  });
});

describe("parseHostname", () => {
  it('extracts hostname from https URL', () => {
    const result = parseHostname("https://example.com/path");
    expect(result).toBe("example.com");
  });

  it('returns bare hostname as-is', () => {
    const result = parseHostname("example.com");
    expect(result).toBe("example.com");
  });
});
