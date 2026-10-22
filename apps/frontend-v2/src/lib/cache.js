// In-memory promise cache. Cards, pages, and dialogs ask for the same NFT,
// profile, and collection records; this collapses those into one request.
const entries = new Map();

export const cached = (key, load, ttl = 60_000) => {
  const entry = entries.get(key);
  if (entry && Date.now() - entry.time < ttl) {
    return entry.promise;
  }
  const promise = load();
  entries.set(key, { promise, time: Date.now() });
  // Failures aren't cached, so a retry refetches.
  promise.catch(() => {
    if (entries.get(key)?.promise === promise) {
      entries.delete(key);
    }
  });
  return promise;
};

// Drops every key starting with one of the prefixes (after a write).
export const invalidate = (...prefixes) => {
  for (const key of entries.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      entries.delete(key);
    }
  }
};
