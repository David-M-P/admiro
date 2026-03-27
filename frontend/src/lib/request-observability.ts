type JsonLike =
  | null
  | string
  | number
  | boolean
  | JsonLike[]
  | { [key: string]: JsonLike };

const toCanonicalJsonValue = (value: unknown): JsonLike => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toCanonicalJsonValue(item));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const result: { [key: string]: JsonLike } = {};
    for (const [key, child] of entries) {
      result[key] = toCanonicalJsonValue(child);
    }
    return result;
  }

  return String(value);
};

export const stableStringify = (value: unknown): string =>
  JSON.stringify(toCanonicalJsonValue(value));

export const buildSessionCacheKey = (endpoint: string, payload: unknown): string =>
  `${endpoint}:${stableStringify(payload)}`;

export const setSessionCacheValue = <T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  maxEntries: number
) => {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  while (cache.size > maxEntries) {
    const firstKey = cache.keys().next().value;
    if (typeof firstKey !== "string") break;
    cache.delete(firstKey);
  }
};

export type FetchTransferMetrics = {
  ttfbMs: number | null;
  downloadMs: number | null;
  encodedBodySize: number | null;
  transferSize: number | null;
};

const isResourceTimingEntry = (entry: PerformanceEntry): entry is PerformanceResourceTiming =>
  typeof (entry as PerformanceResourceTiming).responseEnd === "number" &&
  typeof (entry as PerformanceResourceTiming).responseStart === "number";

const validMetric = (value: number) => (Number.isFinite(value) && value > 0 ? value : null);

export const getFetchTransferMetrics = (
  requestUrl: string,
  fetchStartedAtMs: number,
  fetchEndedAtMs: number
): FetchTransferMetrics | null => {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return null;
  }

  const entries = performance
    .getEntriesByType("resource")
    .filter(isResourceTimingEntry)
    .filter((entry) => entry.name === requestUrl || entry.name.includes(requestUrl));

  if (entries.length === 0) return null;

  const matchingWindow = entries.filter(
    (entry) => entry.startTime <= fetchEndedAtMs + 50 && entry.responseEnd >= fetchStartedAtMs - 50
  );
  const candidates = matchingWindow.length > 0 ? matchingWindow : entries;
  const latest = candidates
    .slice()
    .sort((a, b) => Math.abs(a.responseEnd - fetchEndedAtMs) - Math.abs(b.responseEnd - fetchEndedAtMs))[0];

  if (!latest) return null;

  const requestStart = latest.requestStart > 0 ? latest.requestStart : latest.startTime;
  const ttfbMs = validMetric(latest.responseStart - requestStart);
  const downloadMs = validMetric(latest.responseEnd - latest.responseStart);
  const encodedBodySize = validMetric(latest.encodedBodySize);
  const transferSize = validMetric(latest.transferSize);

  return { ttfbMs, downloadMs, encodedBodySize, transferSize };
};

const fmt = (value: number) => value.toFixed(1);

export const formatTransferMetrics = (metrics: FetchTransferMetrics | null): string => {
  if (!metrics) return "transfer: unavailable";
  const parts: string[] = [];
  if (metrics.ttfbMs !== null) parts.push(`ttfb: ${fmt(metrics.ttfbMs)} ms`);
  if (metrics.downloadMs !== null) parts.push(`download: ${fmt(metrics.downloadMs)} ms`);
  if (metrics.encodedBodySize !== null) parts.push(`encoded: ${(metrics.encodedBodySize / 1024).toFixed(1)} KiB`);
  if (metrics.transferSize !== null) parts.push(`transfer: ${(metrics.transferSize / 1024).toFixed(1)} KiB`);
  if (parts.length === 0) return "transfer: unavailable";
  return parts.join(" | ");
};
