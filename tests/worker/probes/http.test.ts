// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { probeHttp } from "../../../worker/src/probes/http";

describe("probeHttp", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns status 1 and correct responseTimeMs when status matches expectedStatusCode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 200 }),
    );

    const result = await probeHttp("https://example.com", 5000, 200);

    expect(result.status).toBe(1);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.statusCode).toBe(200);
    expect(result.error).toBeUndefined();
  });

  it("returns status 0 with error when status does not match expectedStatusCode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 500 }),
    );

    const result = await probeHttp("https://example.com", 5000, 200);

    expect(result.status).toBe(0);
    expect(result.statusCode).toBe(500);
    expect(result.error).toContain("Expected 200");
    expect(result.error).toContain("500");
  });

  it("returns status 0 with timeout error when request exceeds timeoutMs", async () => {
    const err = new DOMException("The operation was aborted", "TimeoutError");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(err),
    );

    const result = await probeHttp("https://example.com", 3000, 200);

    expect(result.status).toBe(0);
    expect(result.error).toContain("Timeout");
    expect(result.error).toContain("3000");
    expect(result.statusCode).toBeUndefined();
  });

  it("returns status 0 with network error on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND example.com")),
    );

    const result = await probeHttp("https://example.com", 5000, 200);

    expect(result.status).toBe(0);
    expect(result.error).toContain("ENOTFOUND");
    expect(result.statusCode).toBeUndefined();
  });

  it("does not follow redirects -- 301 is the status code received", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 301 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await probeHttp("https://example.com", 5000, 301);

    expect(result.status).toBe(1);
    expect(result.statusCode).toBe(301);

    // Verify redirect: 'manual' was passed
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("populates statusCode even on status mismatch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 404 }),
    );

    const result = await probeHttp("https://example.com", 5000, 200);

    expect(result.status).toBe(0);
    expect(result.statusCode).toBe(404);
  });

  it("never rejects -- always resolves with ProbeResult", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("catastrophic failure")),
    );

    // Should not throw
    const result = await probeHttp("https://example.com", 5000, 200);
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("responseTimeMs");
  });
});
