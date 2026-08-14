// ponytail: module-level cache, lazy eviction, no cap (keys are user-controlled and few)
const cache = new Map<string, { expires: number; value: unknown }>();

export function memo<T>(key: string, ttlSeconds: number, fn: () => T): T {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now < hit.expires) return hit.value as T;
  const value = fn();
  cache.set(key, { expires: now + ttlSeconds * 1000, value });
  return value;
}
