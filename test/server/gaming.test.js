import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { summarize, msUntilNextHour } from '../../src/server/gaming.js';

describe('summarize', () => {
  it('returns zeros for empty list and gaming=false', () => {
    expect(summarize([])).toEqual({
      total: 0, running: 0, paused: 0, downloading: 0, gaming: false,
    });
  });

  it('counts running, paused, downloading by qBit state', () => {
    const torrents = [
      { state: 'downloading' },
      { state: 'metaDL' },
      { state: 'forcedDL' },
      { state: 'stalledDL' },
      { state: 'queuedDL' },
      { state: 'allocating' },
      { state: 'uploading' },
      { state: 'forcedUP' },
      { state: 'stalledUP' },
      { state: 'queuedUP' },
      { state: 'pausedDL' },
      { state: 'pausedUP' },
      { state: 'stoppedDL' },
      { state: 'stoppedUP' },
      { state: 'error' },
      { state: 'missingFiles' },
      { state: 'checkingDL' },
      { state: 'moving' },
    ];
    const s = summarize(torrents);
    expect(s.total).toBe(18);
    expect(s.running).toBe(10); // 6 DL + 4 UP active states
    expect(s.downloading).toBe(6); // downloading, metaDL, forcedDL, stalledDL, queuedDL, allocating
    expect(s.paused).toBe(4); // pausedDL, pausedUP, stoppedDL, stoppedUP
    expect(s.gaming).toBe(false);
  });

  it('gaming=true only when total>0 and zero running', () => {
    expect(summarize([{ state: 'pausedDL' }, { state: 'error' }]).gaming).toBe(true);
    expect(summarize([{ state: 'pausedDL' }, { state: 'downloading' }]).gaming).toBe(false);
  });

  it('gaming=false when total=0 even though running=0', () => {
    expect(summarize([]).gaming).toBe(false);
  });

  it('treats unknown/check/move states as not running', () => {
    const torrents = [
      { state: 'checkingResumeData' },
      { state: 'checkingUP' },
      { state: 'unknown' },
      { state: 'moving' },
    ];
    const s = summarize(torrents);
    expect(s.running).toBe(0);
    expect(s.gaming).toBe(true);
  });
});

describe('msUntilNextHour', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns positive ms to today\'s next occurrence when current time is before target', () => {
    vi.setSystemTime(new Date(2026, 4, 4, 0, 30, 0)); // 00:30 local
    const ms = msUntilNextHour(1); // → 01:00 local, 30min away
    expect(ms).toBe(30 * 60_000);
  });

  it('rolls over to next day when target hour has already passed today', () => {
    vi.setSystemTime(new Date(2026, 4, 4, 2, 0, 0)); // 02:00 local, past 01:00
    const ms = msUntilNextHour(1);
    // 23h until 01:00 tomorrow
    expect(ms).toBe(23 * 60 * 60_000);
  });

  it('rolls over when called exactly at the target hour (boundary handling)', () => {
    vi.setSystemTime(new Date(2026, 4, 4, 1, 0, 0, 0)); // exactly 01:00
    const ms = msUntilNextHour(1);
    // next:= 01:00 today; <= now → setDate +1 → 24h
    expect(ms).toBe(24 * 60 * 60_000);
  });
});
