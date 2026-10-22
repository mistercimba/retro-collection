/** Small process-local acceleration only; correctness never depends on a warm instance. */
export function boundedMemoize<T>(build: (key: string) => T, limit = 4096) {
  const values = new Map<string, T>();
  return (key: string): T => {
    if (values.has(key)) {
      const value = values.get(key)!;
      values.delete(key);
      values.set(key, value);
      return value;
    }
    const value = build(key);
    if (values.size >= limit) values.delete(values.keys().next().value!);
    values.set(key, value);
    return value;
  };
}

/** One snapshot per loader, bounded TTL, concurrent callers share the same read/parse. */
export function singleFlightSnapshot<T>(ttlMs: number, now = Date.now) {
  let current: { key: string; pending: Promise<T | null>; expires: number } | undefined;
  return (key: string, load: () => Promise<T | null>): Promise<T | null> => {
    if (current?.key === key && current.expires > now()) return current.pending;
    const entry = { key, pending: Promise.resolve(null) as Promise<T | null>, expires: Infinity };
    current = entry;
    entry.pending = Promise.resolve().then(load).then((value) => {
      if (current === entry) {
        if (value === null) current = undefined;
        else entry.expires = now() + ttlMs;
      }
      return value;
    }, (error) => {
      if (current === entry) current = undefined;
      throw error;
    });
    return entry.pending;
  };
}
