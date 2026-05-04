import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fmtAgo, scrubDot, snapDot, smartDot } from '../../src/lib/nas-health.js';

const DAY = 86_400_000;
const NOW = new Date('2026-05-04T12:00:00Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('fmtAgo', () => {
  it.each([
    [null, '—'],
    [undefined, '—'],
    [NOW, 'today'],
    [NOW - 1 * DAY, '1d'],
    [NOW - 5 * DAY, '5d'],
    [NOW - 60 * DAY, '2mo'],
    [NOW - 400 * DAY, '1y'],
  ])('fmtAgo(%s) === %s', (ts, expected) => {
    expect(fmtAgo(ts)).toBe(expected);
  });
});

describe('scrubDot', () => {
  it('warns when no scrub recorded', () => {
    expect(scrubDot({}).cls).toBe('warn');
  });
  it('warns while scanning', () => {
    const r = scrubDot({ scrubState: 'SCANNING', scrubFn: 'scrub' });
    expect(r.cls).toBe('warn');
    expect(r.txt).toMatch(/running/);
  });
  it('downgrades to "down" when errors > 0', () => {
    const r = scrubDot({ scrubEnd: NOW - 5 * DAY, scrubErrors: 2, scrubFn: 'scrub' });
    expect(r.cls).toBe('down');
    expect(r.txt).toMatch(/2 errors/);
  });
  it('marks stale after 45 days', () => {
    const r = scrubDot({ scrubEnd: NOW - 60 * DAY, scrubErrors: 0 });
    expect(r.cls).toBe('warn');
    expect(r.txt).toMatch(/stale/);
  });
  it('clean when fresh and no errors', () => {
    const r = scrubDot({ scrubEnd: NOW - 10 * DAY, scrubErrors: 0 });
    expect(r.cls).toBe('up');
    expect(r.txt).toMatch(/clean/);
  });
});

describe('snapDot', () => {
  it('warns with no snapshots', () => {
    expect(snapDot({}).cls).toBe('warn');
  });
  it('warns when last snap older than 7 days', () => {
    expect(snapDot({ latestSnap: NOW - 14 * DAY }).cls).toBe('warn');
  });
  it('up when fresh', () => {
    expect(snapDot({ latestSnap: NOW - 1 * DAY }).cls).toBe('up');
  });
});

describe('smartDot', () => {
  it('warns when no disk data for pool', () => {
    expect(smartDot([], 'tank').cls).toBe('warn');
    expect(smartDot([{ pool: 'other', temp: 40 }], 'tank').cls).toBe('warn');
  });
  it('marks down when any critical', () => {
    const r = smartDot([{ pool: 'tank', critical: true, temp: 35 }], 'tank');
    expect(r.cls).toBe('down');
    expect(r.txt).toMatch(/SMART critical/);
  });
  it('down at >=55C', () => {
    expect(smartDot([{ pool: 'tank', temp: 55 }], 'tank').cls).toBe('down');
  });
  it('warn between 50 and 54C', () => {
    expect(smartDot([{ pool: 'tank', temp: 51 }], 'tank').cls).toBe('warn');
  });
  it('up below 50C', () => {
    const r = smartDot([{ pool: 'tank', temp: 40 }, { pool: 'tank', temp: 45 }], 'tank');
    expect(r.cls).toBe('up');
    expect(r.txt).toMatch(/2 disks · max 45°C/);
  });
  it('up with disks but no temp data', () => {
    const r = smartDot([{ pool: 'tank' }], 'tank');
    expect(r.cls).toBe('up');
    expect(r.txt).toMatch(/1 disks/);
  });
});
