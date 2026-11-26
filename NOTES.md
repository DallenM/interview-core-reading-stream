# Reading stream notes

## Completed

- **Tier 1:** `summarize` filters readings in arrival order. It tracks seen sequences and the newest accepted timestamp per device. It accumulates count, min, max, and average per populated window and sorts by device ID and window start. The average calculation rescales the sum if it would overflow.
- **Tier 2 gaps:** `detectGaps` reuses the same acceptance filter, then sorts each device's accepted timestamps and checks adjacent pairs. Gaps must be strictly longer than `gapMs`.
- **Verification:** All 19 tests passed on Node.js 22 and 26. I checked the sample CLI output and compared batch summaries against a separate reference calculation on the sample and a generated fixture.

## Assumptions and tradeoffs

I assumed finite epoch timestamps, a positive window size, nonnegative duration thresholds, and ordered value bounds. Resends retain their original timestamp, as specified. The batch filter stores one entry per distinct device/sequence pair. Window summaries store aggregate statistics, and gap detection stores accepted timestamps for sorting. Both functions preserve the input.

## Deferred work

I stopped after Tier 2 gap detection to stay within the exercise time. I left `createStream` open because the input contract gives no fixed bound on exact deduplication state. A device can send arbitrarily many invalid readings without moving its newest accepted timestamp. A later valid arrival must be dropped if its sequence was seen in that invalid history, so a timestamp cutoff alone cannot bound how much history matters.

With more time, I would clarify a bound on the number of active devices and on the number of seen sequences per device whose timestamps are still at or above the lateness cutoff, including invalid readings ahead of the newest accepted timestamp. With such a guarantee, the stream could evict sequences older than each device's cutoff, emit windows whose exclusive end is at or before that cutoff, and flush the rest on `end`.

I left out the optional p95 stretch because I estimated another 15–20 minutes to implement, test, and document it. That would have pushed the total past the one-hour budget.

## AI assistance

I used Codex to review the requirements, implement and test Tier 1 and gap detection, investigate the streaming constraint, and troubleshoot local Git. The [collaboration instructions](AGENTS.md) and [redacted session transcript](transcripts/codex.md) are included.
