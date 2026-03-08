/**
 * Parse a TCP target URL into host and port.
 * Handles: tcp://host:port, host:port, http://host:port, bare hostname
 */
export function parseTcpTarget(url: string): { host: string; port: number } {
  // Only attempt URL parsing if the string contains a protocol scheme (://)
  if (url.includes("://")) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname) {
        return {
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : 80,
        };
      }
    } catch {
      // Fall through to manual parsing
    }
  }

  // Manual parsing for bare host:port or bare hostname
  const parts = url.split(":");
  if (parts.length === 2 && parts[1].length > 0) {
    const port = parseInt(parts[1], 10);
    if (!isNaN(port)) {
      return { host: parts[0], port };
    }
  }
  return { host: url, port: 80 };
}

/**
 * Extract hostname from a URL string.
 * Handles: https://example.com/path, example.com
 */
export function parseHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    // Strip protocol and path, extract host
    return url.replace(/^[a-z]+:\/\//, "").split(/[:/]/)[0];
  }
}
