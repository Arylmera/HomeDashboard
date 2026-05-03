/* ============================================================== *
 *  Shared HTTP helpers for Vite-middleware service routes.
 *
 *  - send(res, status, obj)      JSON response with Content-Type
 *  - readJsonBody(req, max)      drain + JSON.parse, size-capped
 *  - fetchWithTimeout(url, ...)  AbortController-backed fetch
 *  - sanitizeError(e)            short, non-leaky error string
 * ============================================================== */

export function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

const DEFAULT_BODY_LIMIT = 64 * 1024;

export function readJsonBody(req, { limit = DEFAULT_BODY_LIMIT } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        req.destroy();
        reject(new Error('body_too_large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

export async function fetchWithTimeout(url, init = {}, timeoutMs = 10_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Short, deterministic error string. Strips stack traces, query-strings,
// and any token-looking substrings. Use before forwarding upstream errors
// to clients so internal URLs / credentials don't leak.
export function sanitizeError(e) {
  const msg = String(e?.message || e || 'error');
  return msg
    .replace(/\?[^\s]*/g, '')
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, '<redacted>')
    .slice(0, 200);
}
