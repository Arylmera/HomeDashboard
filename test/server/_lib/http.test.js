import { describe, it, expect, vi } from 'vitest';
import { send, readJsonBody, fetchWithTimeout, sanitizeError } from '../../../src/server/_lib/http.js';
import { Readable } from 'node:stream';

function mockReq(body) {
  const r = Readable.from(Buffer.isBuffer(body) ? [body] : [Buffer.from(body)]);
  r.destroy = vi.fn();
  return r;
}

function mockRes() {
  const headers = {};
  return {
    statusCode: 200,
    setHeader: (k, v) => { headers[k] = v; },
    end: vi.fn(),
    getHeader: (k) => headers[k],
    headers,
  };
}

describe('send', () => {
  it('sets status, content-type, no-store, body', () => {
    const res = mockRes();
    send(res, 201, { ok: true });
    expect(res.statusCode).toBe(201);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.end).toHaveBeenCalledWith('{"ok":true}');
  });
});

describe('readJsonBody', () => {
  it('parses valid JSON', async () => {
    const r = await readJsonBody(mockReq('{"a":1}'));
    expect(r).toEqual({ a: 1 });
  });
  it('returns {} for empty body', async () => {
    const r = await readJsonBody(mockReq(''));
    expect(r).toEqual({});
  });
  it('rejects invalid JSON with sentinel', async () => {
    await expect(readJsonBody(mockReq('not json'))).rejects.toThrow('invalid_json');
  });
  it('rejects oversized body', async () => {
    const big = 'x'.repeat(100);
    await expect(readJsonBody(mockReq(big), { limit: 50 }))
      .rejects.toThrow('body_too_large');
  });
});

describe('sanitizeError', () => {
  it('strips query strings', () => {
    expect(sanitizeError(new Error('GET https://api.example.com/x?token=abc → 401')))
      .not.toContain('token=abc');
  });
  it('redacts long token-like substrings', () => {
    const long = 'a'.repeat(40);
    expect(sanitizeError(new Error(`auth failed: ${long}`)))
      .toContain('<redacted>');
  });
  it('caps length', () => {
    expect(sanitizeError(new Error('x'.repeat(500))).length).toBeLessThanOrEqual(200);
  });
  it('handles non-Error inputs', () => {
    expect(sanitizeError(null)).toBe('error');
    expect(sanitizeError('plain')).toBe('plain');
  });
});

describe('fetchWithTimeout', () => {
  it('aborts after timeout', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (url, opts) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    try {
      await expect(fetchWithTimeout('http://slow', {}, 20))
        .rejects.toThrow();
    } finally {
      globalThis.fetch = orig;
    }
  });
  it('forwards successful response', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, status: 200 });
    try {
      const r = await fetchWithTimeout('http://fast', {}, 1000);
      expect(r.ok).toBe(true);
    } finally {
      globalThis.fetch = orig;
    }
  });
});
