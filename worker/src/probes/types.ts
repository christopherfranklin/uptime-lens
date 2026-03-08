export interface ProbeResult {
  status: 1 | 0;
  responseTimeMs: number;
  statusCode?: number;
  error?: string;
  sslExpiresAt?: Date;
}
