// ponytail: module-level cache, lazy eviction, no cap (keys are user-controlled and few)
const cache = new Map<string, { expires: number; value: unknown }>();

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function memo<T>(key: string, ttlSeconds: number, fn: () => T): T {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now < hit.expires) return hit.value as T;
  const value = fn();
  // ponytail: empty often means "data not loaded yet" (tile rendered before entities
  // arrived) — don't freeze that for the whole ttl. Recompute until there is data.
  if (!isEmpty(value)) {
    cache.set(key, { expires: now + ttlSeconds * 1000, value });
  }
  return value;
}
