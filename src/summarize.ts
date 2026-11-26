import { createReadingFilter } from './acceptance.ts';
import type { Config, Reading, WindowSummary } from './types.ts';

type WindowStats = { count: number; min: number; max: number; sum: number; sumScale: number };

/**
 * Tier 1. Clean `readings` (given in arrival order) and summarize each
 * device's accepted readings per window. See "Rules" in the README.
 */
export function summarize(readings: Reading[], config: Config): WindowSummary[] {
  const accept = createReadingFilter(config);
  const devices = new Map<string, Map<number, WindowStats>>();

  for (const reading of readings) {
    if (!accept(reading)) continue;

    const { deviceId, ts, value } = reading;
    let windows = devices.get(deviceId);
    if (!windows) {
      windows = new Map();
      devices.set(deviceId, windows);
    }

    const windowStart = Math.floor(ts / config.windowMs) * config.windowMs;
    const stats = windows.get(windowStart);
    if (stats) {
      stats.count++;
      stats.min = Math.min(stats.min, value);
      stats.max = Math.max(stats.max, value);
      const nextSum = stats.sum + value / stats.sumScale;
      if (Number.isFinite(nextSum)) {
        stats.sum = nextSum;
      } else {
        // Double the divisor so each addend is at most half the largest finite number.
        stats.sumScale *= 2;
        stats.sum = stats.sum / 2 + value / stats.sumScale;
      }
    } else {
      windows.set(windowStart, { count: 1, min: value, max: value, sum: value, sumScale: 1 });
    }
  }

  const summaries: WindowSummary[] = [];
  for (const [deviceId, windows] of devices) {
    for (const [windowStart, { count, min, max, sum, sumScale }] of windows) {
      const mean = sum / count;
      // Rounding during rescaling can put the mean just outside the observed range.
      const avg = sumScale === 1 ? mean : Math.min(max, Math.max(min, mean * sumScale));
      summaries.push({ deviceId, windowStart, count, min, max, avg });
    }
  }
  return summaries.sort((a, b) => {
    if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
    return a.windowStart - b.windowStart;
  });
}
