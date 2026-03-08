// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import tls from "node:tls";
import { probeSsl } from "../../../worker/src/probes/ssl";

// Mock the tls module
vi.mock("node:tls", () => {
  return {
    default: {
      connect: vi.fn(),
    },
  };
});

function createMockTlsSocket(cert?: { valid_to?: string }) {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const socket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
      return socket;
    }),
    destroy: vi.fn(),
    getPeerCertificate: vi.fn().mockReturnValue(cert ?? {}),
    _handlers: handlers,
  };
  return socket;
}

describe("probeSsl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns status 1 with sslExpiresAt when TLS handshake succeeds and cert has valid_to", async () => {
    const certDate = "Dec 31 23:59:59 2027 GMT";
    const mockSocket = createMockTlsSocket({ valid_to: certDate });
    vi.mocked(tls.connect).mockReturnValue(mockSocket as never);

    const promise = probeSsl("example.com", 443, 5000);
    mockSocket._handlers.secureConnect();

    const result = await promise;

    expect(result.status).toBe(1);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.sslExpiresAt).toBeInstanceOf(Date);
    expect(result.sslExpiresAt!.getFullYear()).toBe(2027);
    expect(result.error).toBeUndefined();
  });

  it("returns status 0 with error when no certificate returned", async () => {
    const mockSocket = createMockTlsSocket(undefined);
    mockSocket.getPeerCertificate.mockReturnValue({});
    vi.mocked(tls.connect).mockReturnValue(mockSocket as never);

    const promise = probeSsl("example.com", 443, 5000);
    mockSocket._handlers.secureConnect();

    const result = await promise;

    expect(result.status).toBe(0);
    expect(result.error).toContain("No certificate");
  });

  it("returns status 0 with timeout error on TLS handshake timeout", async () => {
    const mockSocket = createMockTlsSocket();
    vi.mocked(tls.connect).mockReturnValue(mockSocket as never);

    const promise = probeSsl("example.com", 443, 3000);
    mockSocket._handlers.timeout();

    const result = await promise;

    expect(result.status).toBe(0);
    expect(result.error).toContain("timed out");
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("returns status 0 with error on TLS connection error", async () => {
    const mockSocket = createMockTlsSocket();
    vi.mocked(tls.connect).mockReturnValue(mockSocket as never);

    const promise = probeSsl("example.com", 443, 5000);
    mockSocket._handlers.error(new Error("CERT_HAS_EXPIRED"));

    const result = await promise;

    expect(result.status).toBe(0);
    expect(result.error).toContain("CERT_HAS_EXPIRED");
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("uses rejectUnauthorized: false and servername for SNI", async () => {
    const mockSocket = createMockTlsSocket({ valid_to: "Dec 31 23:59:59 2027 GMT" });
    vi.mocked(tls.connect).mockReturnValue(mockSocket as never);

    const promise = probeSsl("example.com", 443, 5000);
    mockSocket._handlers.secureConnect();
    await promise;

    expect(tls.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        rejectUnauthorized: false,
        servername: "example.com",
      }),
    );
  });

  it("never rejects -- always resolves with ProbeResult", async () => {
    const mockSocket = createMockTlsSocket();
    vi.mocked(tls.connect).mockReturnValue(mockSocket as never);

    const promise = probeSsl("example.com", 443, 5000);
    mockSocket._handlers.error(new Error("catastrophic"));

    const result = await promise;
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("responseTimeMs");
  });
});
