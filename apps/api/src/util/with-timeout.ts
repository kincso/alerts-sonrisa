export const SEND_TIMEOUT_MS = 10_000;

/**
 * Runs `task` and rejects if it hasn't settled within `ms`. The signal is aborted on
 * timeout so transports that support it (fetch) stop the request too.
 */
export async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timed out after ${ms / 1000}s`));
    }, ms);
  });
  try {
    return await Promise.race([task(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
