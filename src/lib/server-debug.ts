/** Prefix server logs for Vercel / `next start` log filtering. Set `ATTENDANCE_DEBUG=1` for verbose `[auth-email]` logs. */
export function logApi(tag: string, ...args: unknown[]) {
  console.log(`[${tag}]`, ...args);
}

export function logApiError(tag: string, message: string, err?: unknown) {
  const detail =
    err instanceof Error ? { message: err.message, stack: err.stack } : err;
  console.error(`[${tag}] ${message}`, detail);
}
