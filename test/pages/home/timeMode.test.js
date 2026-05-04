import { describe, it, expect } from 'vitest';
import { timeModeFor, SECTION_ORDERS } from '../../../src/pages/home/timeMode.js';

const at = (h) => {
  const d = new Date('2026-05-04T00:00:00Z');
  d.setHours(h);
  return d;
};

describe('timeModeFor', () => {
  it.each([
    [0, 'night'],
    [4, 'night'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [22, 'evening'],
    [23, 'night'],
  ])('hour %i → %s', (h, expected) => {
    expect(timeModeFor(at(h))).toBe(expected);
  });
});

describe('SECTION_ORDERS', () => {
  const KEYS = ['pages', 'quickapps', 'recent', 'day', 'bottom'];
  it('every mode lists exactly the section keys, no dupes', () => {
    for (const [name, order] of Object.entries(SECTION_ORDERS)) {
      expect(order, name).toHaveLength(KEYS.length);
      expect(new Set(order), name).toEqual(new Set(KEYS));
    }
  });
  it('every mode keeps "pages" first (primary entry)', () => {
    for (const [name, order] of Object.entries(SECTION_ORDERS)) {
      expect(order[0], name).toBe('pages');
    }
  });
  it('exposes default + 4 time modes', () => {
    expect(Object.keys(SECTION_ORDERS).sort()).toEqual(
      ['afternoon', 'default', 'evening', 'morning', 'night'],
    );
  });
});
