import { describe, it, expect } from 'vitest';
import {
  parseIcsDate, unfold, iterComponents, getProp,
  parseEvent, parseTodo, extractCalendarData,
} from '../../src/server/icloud.js';

describe('parseIcsDate', () => {
  it('parses date-only', () => {
    const d = parseIcsDate('20260502');
    expect(d.toISOString()).toBe('2026-05-02T00:00:00.000Z');
  });
  it('parses UTC timestamp', () => {
    const d = parseIcsDate('20260502T143000Z');
    expect(d.toISOString()).toBe('2026-05-02T14:30:00.000Z');
  });
  it('returns null on garbage', () => {
    expect(parseIcsDate('not a date')).toBeNull();
  });
});

describe('unfold', () => {
  it('joins continuation lines (RFC 5545)', () => {
    expect(unfold('SUMMARY:Hello\r\n World')).toBe('SUMMARY:HelloWorld');
    expect(unfold('SUMMARY:Hello\n\tWorld')).toBe('SUMMARY:HelloWorld');
  });
});

describe('getProp', () => {
  it('returns value with no params', () => {
    expect(getProp('UID:abc-123', 'UID')).toEqual({ params: '', value: 'abc-123' });
  });
  it('returns params + value', () => {
    expect(getProp('DTSTART;VALUE=DATE:20260502', 'DTSTART'))
      .toEqual({ params: ';VALUE=DATE', value: '20260502' });
  });
  it('returns null for missing', () => {
    expect(getProp('SUMMARY:foo', 'NOPE')).toBeNull();
  });
});

describe('iterComponents', () => {
  it('yields each VEVENT body', () => {
    const ics = `BEGIN:VEVENT\r\nUID:1\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:2\r\nEND:VEVENT`;
    const blocks = [...iterComponents(ics, 'VEVENT')];
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('UID:1');
    expect(blocks[1]).toContain('UID:2');
  });
});

describe('parseEvent', () => {
  it('parses minimal VEVENT', () => {
    const block = `UID:abc
SUMMARY:Test
DTSTART:20260502T143000Z
DTEND:20260502T153000Z`;
    const ev = parseEvent(block);
    expect(ev.uid).toBe('abc');
    expect(ev.title).toBe('Test');
    expect(ev.allDay).toBe(false);
    expect(ev.start).toBe('2026-05-02T14:30:00.000Z');
    expect(ev.end).toBe('2026-05-02T15:30:00.000Z');
  });
  it('detects all-day event', () => {
    const block = `UID:x
SUMMARY:All day
DTSTART;VALUE=DATE:20260502`;
    const ev = parseEvent(block);
    expect(ev.allDay).toBe(true);
    expect(ev.end).toBeNull();
  });
  it('returns null without DTSTART', () => {
    expect(parseEvent('UID:x\nSUMMARY:no time')).toBeNull();
  });
  it('un-escapes commas and newlines in summary', () => {
    expect(parseEvent('SUMMARY:a\\, b\\nc\nDTSTART:20260502T000000Z').title)
      .toBe('a, b c');
  });
});

describe('parseTodo', () => {
  it('parses VTODO with status', () => {
    const block = `UID:t1
SUMMARY:Buy milk
STATUS:NEEDS-ACTION
DUE:20260510T000000Z`;
    const t = parseTodo(block);
    expect(t.uid).toBe('t1');
    expect(t.title).toBe('Buy milk');
    expect(t.completed).toBe(false);
    expect(t.due).toBe('2026-05-10T00:00:00.000Z');
  });
  it('marks completed', () => {
    expect(parseTodo('SUMMARY:Done\nSTATUS:COMPLETED').completed).toBe(true);
  });
  it('handles missing DUE', () => {
    expect(parseTodo('SUMMARY:x').due).toBeNull();
  });
});

describe('extractCalendarData', () => {
  it('extracts and decodes blobs', () => {
    const xml = `<multistatus>
      <response><href>/x.ics</href>
        <calendar-data>BEGIN:VCALENDAR&#10;BEGIN:VEVENT&#10;END:VEVENT&#10;END:VCALENDAR</calendar-data>
      </response>
      <response><href>/y.ics</href>
        <calendar-data><![CDATA[BEGIN:VCALENDAR
BEGIN:VEVENT
END:VEVENT
END:VCALENDAR]]></calendar-data>
      </response>
    </multistatus>`;
    const blobs = extractCalendarData(xml);
    expect(blobs).toHaveLength(2);
    expect(blobs[1]).toContain('BEGIN:VEVENT');
  });
});
