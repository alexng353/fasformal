const windows = new Map<string, { count: number; resetsAt: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (entry.resetsAt <= now) windows.delete(key);
  }
}, 60_000);

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || entry.resetsAt <= now) {
    windows.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfterMs: entry.resetsAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}
