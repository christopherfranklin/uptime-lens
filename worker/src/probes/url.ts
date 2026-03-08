/**
 * Parse a TCP target URL into host and port.
 * Handles: tcp://host:port, host:port, http://host:port, bare hostname
 */
export function parseTcpTarget(_url: string): { host: string; port: number } {
  // TODO: implement
  return { host: "", port: 0 };
}

/**
 * Extract hostname from a URL string.
 * Handles: https://example.com/path, example.com
 */
export function parseHostname(_url: string): string {
  // TODO: implement
  return "";
}
