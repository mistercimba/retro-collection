export type LibraryReadRetryEvent = {
  attempt: number;
  reason: "error" | "missing";
  error?: unknown;
};

type RetryLibraryReadOptions = {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetryError?: (error: unknown) => boolean;
  onRetry?: (event: LibraryReadRetryEvent) => void;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function retryLibraryRead<T>(
  read: () => Promise<T | null>,
  {
    attempts = 3,
    delayMs = 125,
    sleep = defaultSleep,
    shouldRetryError = () => true,
    onRetry,
  }: RetryLibraryReadOptions = {},
): Promise<T | null> {
  const totalAttempts = Math.max(1, Math.floor(attempts));

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      const value = await read();
      if (value !== null || attempt === totalAttempts) return value;
      onRetry?.({ attempt, reason: "missing" });
    } catch (error) {
      if (attempt === totalAttempts || !shouldRetryError(error)) throw error;
      onRetry?.({ attempt, reason: "error", error });
    }

    await sleep(delayMs * attempt);
  }

  return null;
}
