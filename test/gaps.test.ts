import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, detectGaps, type Reading } from '../src/index.ts';

const reading = (deviceId: string, ts: number, value: number | null = 1): Reading => ({
  deviceId,
  ts,
  seq: ts,
  value,
});

test('requires two accepted readings from the same device to report a gap', () => {
  assert.deepEqual(detectGaps([], DEFAULT_CONFIG), []);
  assert.deepEqual(detectGaps([reading('a', 0), reading('b', 60_000)], DEFAULT_CONFIG), []);
});

test('reports gaps strictly over the threshold in device and timestamp order', () => {
  const readings = [
    reading('a', 1_000),
    reading('Z', 2_000),
    reading('a', 22_000),
    reading('Z', 12_000),
    reading('a', 17_000),
    reading('Z', 22_001),
    reading('a', 38_000),
  ];
  readings.forEach(Object.freeze);
  Object.freeze(readings);

  assert.deepEqual(detectGaps(readings, DEFAULT_CONFIG), [
    { deviceId: 'Z', start: 12_000, end: 22_001 },
    { deviceId: 'a', start: 1_000, end: 17_000 },
    { deviceId: 'a', start: 22_000, end: 38_000 },
  ]);
});

test('invalid readings, valid resends of them, and too-late readings do not split gaps', () => {
  const readings = [
    reading('a', 0),
    reading('a', 6_000, null),
    reading('a', 6_000),
    reading('a', 20_000),
    reading('a', 11_000),
  ];

  assert.deepEqual(detectGaps(readings, DEFAULT_CONFIG), [{ deviceId: 'a', start: 0, end: 20_000 }]);
});
