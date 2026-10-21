/** A per-request id, echoed by the backend as X-Request-ID (spec §3.5). */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
