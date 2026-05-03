import { describe, it, expect } from 'vitest';
import {
  fmtBytes, fmtRate, fmtNum, pct, clamp, fmtRelativeTime, fmtUptime,
} from '../../src/lib/format.js';

describe('fmtBytes', () => {
  it.each([
    [null, '—'],
    [undefined, '—'],
    [NaN, '—'],
    [0, '0.0 B'],
    [512, '512 B'],
    [1024, '1.0 KiB'],
    [1024 * 1024, '1.0 MiB'],
    [1024 * 1024 * 1024, '1.0 GiB'],
    [1024 ** 5, '1.0 PiB'],
    [12_345_678, '12 MiB'],
  ])('fmtBytes(%s) === %s', (input, expected) => {
    expect(fmtBytes(input)).toBe(expected);
  });
});

describe('fmtRate', () => {
  it('handles missing input', () => {
    expect(fmtRate(null)).toBe('—');
    expect(fmtRate(NaN)).toBe('—');
  });
  it('formats SI bits/sec', () => {
    expect(fmtRate(500)).toBe('500 b/s');
    expect(fmtRate(12_345)).toBe('12 kb/s');
    expect(fmtRate(1_500_000)).toBe('1.5 Mb/s');
    expect(fmtRate(2_500_000_000)).toBe('2.50 Gb/s');
  });
});

describe('fmtNum', () => {
  it('formats with locale separators', () => {
    expect(fmtNum(1234567)).toBe('1,234,567');
    expect(fmtNum(0)).toBe('0');
  });
  it('returns dash for missing/non-finite', () => {
    expect(fmtNum(null)).toBe('—');
    expect(fmtNum(undefined)).toBe('—');
    expect(fmtNum(NaN)).toBe('—');
    expect(fmtNum(Infinity)).toBe('—');
  });
});

describe('pct', () => {
  it('returns 0 when divisor is 0 or missing', () => {
    expect(pct(5, 0)).toBe(0);
    expect(pct(5, null)).toBe(0);
    expect(pct(null, 100)).toBe(0);
  });
  it('rounds to nearest int', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(2, 3)).toBe(67);
    expect(pct(50, 100)).toBe(50);
  });
});

describe('clamp', () => {
  it('bounds value', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('fmtRelativeTime', () => {
  const now = new Date('2026-05-03T12:00:00Z').getTime();
  it.each([
    [now - 30_000, 'just now'],
    [now - 5 * 60_000, '5m ago'],
    [now - 3 * 3_600_000, '3h ago'],
    [now - 2 * 86_400_000, '2d ago'],
    [now - 60 * 86_400_000, '2mo ago'],
    [now - 400 * 86_400_000, '1y ago'],
    [now + 30_000, 'soon'],
    [now + 2 * 3_600_000, 'in 2h'],
  ])('handles %i', (t, expected) => {
    expect(fmtRelativeTime(t, now)).toBe(expected);
  });
  it('accepts Date objects', () => {
    expect(fmtRelativeTime(new Date(now - 60_000), now)).toBe('1m ago');
  });
  it('returns dash for missing', () => {
    expect(fmtRelativeTime(null)).toBe('—');
    expect(fmtRelativeTime(NaN)).toBe('—');
  });
});

describe('fmtUptime', () => {
  it('formats days/hours/minutes', () => {
    expect(fmtUptime(86_400 + 3 * 3_600)).toBe('1d 3h');
    expect(fmtUptime(2 * 3_600 + 30 * 60)).toBe('2h 30m');
    expect(fmtUptime(45 * 60)).toBe('45m');
  });
  it('rejects bad input', () => {
    expect(fmtUptime(null)).toBe('—');
    expect(fmtUptime(-5)).toBe('—');
    expect(fmtUptime(NaN)).toBe('—');
  });
});
