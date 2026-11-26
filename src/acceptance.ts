import type { Config, Reading } from './types.ts';

type AcceptedReading = Reading & { value: number };

type DeviceState = {
  seenSequences: Set<number>;
  newestAcceptedTs: number;
};

/** Creates a filter to call once per reading, in arrival order. */
export function createReadingFilter(config: Config): (reading: Reading) => reading is AcceptedReading {
  const devices = new Map<string, DeviceState>();
  const { maxLatenessMs, validRange } = config;

  return (reading): reading is AcceptedReading => {
    const { deviceId, seq, ts, value } = reading;
    let device = devices.get(deviceId);
    if (!device) {
      device = { seenSequences: new Set(), newestAcceptedTs: -Infinity };
      devices.set(deviceId, device);
    }

    if (device.seenSequences.has(seq)) return false;
    device.seenSequences.add(seq);

    if (value === null || !Number.isFinite(value) || value < validRange.min || value > validRange.max) return false;
    if (device.newestAcceptedTs - ts > maxLatenessMs) return false;

    device.newestAcceptedTs = Math.max(device.newestAcceptedTs, ts);
    return true;
  };
}
