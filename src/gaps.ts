import { createReadingFilter } from './acceptance.ts';
import type { Config, Gap, Reading } from './types.ts';

/**
 * Tier 2. Report every gap in each device's accepted readings.
 * See "Tier 2" in the README.
 */
export function detectGaps(readings: Reading[], config: Config): Gap[] {
  const accept = createReadingFilter(config);
  const timestampsByDevice = new Map<string, number[]>();

  for (const reading of readings) {
    if (!accept(reading)) continue;

    const timestamps = timestampsByDevice.get(reading.deviceId);
    if (timestamps) {
      timestamps.push(reading.ts);
    } else {
      timestampsByDevice.set(reading.deviceId, [reading.ts]);
    }
  }

  const gaps: Gap[] = [];
  for (const [deviceId, timestamps] of timestampsByDevice) {
    timestamps.sort((a, b) => a - b);
    for (let i = 1; i < timestamps.length; i++) {
      const start = timestamps[i - 1];
      const end = timestamps[i];
      if (end - start > config.gapMs) gaps.push({ deviceId, start, end });
    }
  }

  return gaps.sort((a, b) => {
    if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
    return a.start - b.start;
  });
}
