// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import net from "node:net";
import { probeTcp } from "../../../worker/src/probes/tcp";

// Mock the net module
vi.mock("node:net", () => {
  return {
    default: {
      createConnection: vi.fn(),
    },
  };
});

function createMockSocket() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const socket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
      return socket;
    }),
    destroy: vi.fn(),
    _handlers: handlers,
  };
  return socket;
}

describe("probeTcp", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns status 1 when connection succeeds within timeout", async () => {
    const mockSocket = createMockSocket();
    vi.mocked(net.createConnection).mockReturnValue(mockSocket as never);

    const promise = probeTcp("example.com", 80, 5000);

    // Simulate successful connection
    mockSocket._handlers.connect();

    const result = await promise;

    expect(result.status).toBe(1);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("returns status 0 with timeout error when connection times out", async () => {
    const mockSocket = createMockSocket();
    vi.mocked(net.createConnection).mockReturnValue(mockSocket as never);

    const promise = probeTcp("example.com", 80, 3000);

    // Simulate timeout
    mockSocket._handlers.timeout();

    const result = await promise;

    expect(result.status).toBe(0);
    expect(result.error).toContain("timed out");
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("returns status 0 with error message on connection error", async () => {
    const mockSocket = createMockSocket();
    vi.mocked(net.createConnection).mockReturnValue(mockSocket as never);

    const promise = probeTcp("example.com", 80, 5000);

    // Simulate connection error
    mockSocket._handlers.error(new Error("connect ECONNREFUSED 127.0.0.1:80"));

    const result = await promise;

    expect(result.status).toBe(0);
    expect(result.error).toContain("ECONNREFUSED");
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("calls socket.destroy() on every code path", async () => {
    // Test connect path
    const socket1 = createMockSocket();
    vi.mocked(net.createConnection).mockReturnValue(socket1 as never);
    const p1 = probeTcp("host", 80, 5000);
    socket1._handlers.connect();
    await p1;
    expect(socket1.destroy).toHaveBeenCalled();

    // Test timeout path
    const socket2 = createMockSocket();
    vi.mocked(net.createConnection).mockReturnValue(socket2 as never);
    const p2 = probeTcp("host", 80, 5000);
    socket2._handlers.timeout();
    await p2;
    expect(socket2.destroy).toHaveBeenCalled();

    // Test error path
    const socket3 = createMockSocket();
    vi.mocked(net.createConnection).mockReturnValue(socket3 as never);
    const p3 = probeTcp("host", 80, 5000);
    socket3._handlers.error(new Error("fail"));
    await p3;
    expect(socket3.destroy).toHaveBeenCalled();
  });

  it("never rejects -- always resolves with ProbeResult", async () => {
    const mockSocket = createMockSocket();
    vi.mocked(net.createConnection).mockReturnValue(mockSocket as never);

    const promise = probeTcp("example.com", 80, 5000);
    mockSocket._handlers.error(new Error("catastrophic"));

    const result = await promise;
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("responseTimeMs");
  });
});
