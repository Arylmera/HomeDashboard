/* ============================================================== *
 *  iCloud CalDAV — events + reminders.
 *
 *  Mounted as Vite middleware. Performs CalDAV discovery + REPORT
 *  server-side (browser can't follow per-user host redirect or set
 *  the REPORT method through fetch+CORS), returns parsed JSON.
 *
 *  Env:
 *    ICLOUD_USER          Apple ID email
 *    ICLOUD_APP_PASSWORD  app-specific password (appleid.apple.com)
 *    ICLOUD_CALENDAR      calendar displayname (e.g. "Home")
 *    ICLOUD_REMINDERS     reminders list displayname (e.g. "Reminders")
 *
 *  Endpoints:
 *    GET /api/icloud/events  → { state, events:[{title,start,end,allDay,uid}] }
 *    GET /api/icloud/todos   → { state, todos:[{title,due,uid,completed}] }
 *
 *  state: "idle" (env empty) | "live" | "error"
 * ============================================================== */

import { fetchWithTimeout, sanitizeError } from './_lib/http.js';

const ROOT = 'https://caldav.icloud.com';
const HORIZON_DAYS = 7;
const TTL_MS    = 60_000;       // event/todo cache
const DISC_TTL  = 6 * 3600_000; // discovery cache
const FETCH_TIMEOUT_MS = 15_000;

let discovery = null;           // { ts, principal, calendars: [{ url, name, comps }] }
const cache = new Map();        // key → { ts, payload }
const inflight = new Map();

function authHeader() {
  const u = process.env.ICLOUD_USER;
  const p = process.env.ICLOUD_APP_PASSWORD;
  if (!u || !p) return null;
  return 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
}

async function dav(url, method, body, extraHeaders = {}) {
  const auth = authHeader();
  if (!auth) throw new Error('icloud not configured');
  const r = await fetchWithTimeout(url, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/xml; charset=utf-8',
      Accept: 'application/xml',
      ...extraHeaders,
    },
    body,
    redirect: 'follow',
  }, FETCH_TIMEOUT_MS);
  if (!r.ok && r.status !== 207) throw new Error(`${method} ${url} → ${r.status}`);
  return { text: await r.text(), finalUrl: r.url };
}

// crude but adequate XML helpers — multistatus parsing only
function* iterTags(xml, tag) {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, 'g');
  let m; while ((m = re.exec(xml))) yield m[1];
}
function firstHref(xml) {
  const m = xml.match(/<(?:[\w-]+:)?href[^>]*>([^<]+)<\/(?:[\w-]+:)?href>/);
  return m ? m[1].trim() : null;
}
function firstTag(xml, tag) {
  const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`));
  return m ? m[1] : null;
}

async function discover() {
  if (discovery && Date.now() - discovery.ts < DISC_TTL) return discovery;

  // 1. principal
  const body1 = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`;
  const r1 = await dav(`${ROOT}/`, 'PROPFIND', body1, { Depth: '0' });
  const base = new URL(r1.finalUrl).origin;  // pXX-caldav.icloud.com
  const principalPath = firstHref(firstTag(r1.text, 'current-user-principal') || '');
  if (!principalPath) throw new Error('no principal');
  const principalUrl = new URL(principalPath, base).href;

  // 2. calendar-home
  const body2 = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set/></d:prop></d:propfind>`;
  const r2 = await dav(principalUrl, 'PROPFIND', body2, { Depth: '0' });
  const homePath = firstHref(firstTag(r2.text, 'calendar-home-set') || '');
  if (!homePath) throw new Error('no calendar-home');
  const homeUrl = new URL(homePath, base).href;

  // 3. list calendars
  const body3 = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:supported-calendar-component-set/>
  </d:prop></d:propfind>`;
  const r3 = await dav(homeUrl, 'PROPFIND', body3, { Depth: '1' });

  const calendars = [];
  for (const resp of iterTags(r3.text, 'response')) {
    const href = firstHref(resp);
    if (!href) continue;
    const isCal = /<(?:[\w-]+:)?calendar\b/.test(resp);
    if (!isCal) continue;
    const nameRaw = firstTag(resp, 'displayname') || '';
    const name = nameRaw.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1').trim();
    const compSet = firstTag(resp, 'supported-calendar-component-set') || '';
    const comps = [];
    for (const m of compSet.matchAll(/<(?:[\w-]+:)?comp[^>]*name="([^"]+)"/g)) comps.push(m[1]);
    // Fallback: iCloud sometimes omits the comp-set in PROPFIND responses.
    // Infer from the URL — `/calendars/tasks/` (Reminders) vs everything
    // else (events). Real comp-set wins when present.
    if (!comps.length) {
      if (/\/calendars\/tasks\/?$/.test(href)) comps.push('VTODO');
      else comps.push('VEVENT');
    }
    calendars.push({ url: new URL(href, base).href, name, comps });
  }

  discovery = { ts: Date.now(), base, principal: principalUrl, calendars };
  return discovery;
}

function findCalendar(disco, name, comp) {
  if (!name) return null;
  const want = name.toLowerCase();
  return disco.calendars.find(c =>
    c.name.toLowerCase() === want && c.comps.includes(comp)
  ) || disco.calendars.find(c => c.name.toLowerCase() === want);
}

// Resolve `filter` into a list of calendars supporting `comp`.
//   "" / "*" / "all"  → every calendar with that comp
//   "Home,Work"       → comma-separated displaynames
//   "Home"            → single displayname
function findCalendars(disco, filter, comp) {
  const all = disco.calendars.filter(c => c.comps.includes(comp));
  const f = (filter || '').trim();
  if (!f || f === '*' || f.toLowerCase() === 'all') return all;
  const wants = f.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return all.filter(c => wants.includes(c.name.toLowerCase()));
}

function icalDate(d) {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function parseIcsDate(raw) {
  // 20260502T143000Z | 20260502T143000 | 20260502
  const s = raw.trim();
  if (/^\d{8}$/.test(s)) {
    return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
  }
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S, Z] = m;
  if (Z === 'Z') return new Date(Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S));
  return new Date(+Y, +Mo - 1, +D, +H, +Mi, +S);
}

export function unfold(ics) {
  // RFC 5545: lines beginning with space/tab continue the previous line
  return ics.replace(/\r?\n[ \t]/g, '');
}

export function* iterComponents(ics, comp) {
  const re = new RegExp(`BEGIN:${comp}\\r?\\n([\\s\\S]*?)END:${comp}`, 'g');
  let m; while ((m = re.exec(ics))) yield m[1];
}

export function getProp(block, key) {
  const re = new RegExp(`(?:^|\\n)${key}(;[^:\\n]*)?:([^\\n]*)`);
  const m = block.match(re);
  if (!m) return null;
  return { params: m[1] || '', value: m[2].trim() };
}

export function parseEvent(block) {
  const summary = getProp(block, 'SUMMARY')?.value || '(no title)';
  const dtstart = getProp(block, 'DTSTART');
  const dtend   = getProp(block, 'DTEND');
  if (!dtstart) return null;
  const allDay = /VALUE=DATE(?!-TIME)/i.test(dtstart.params);
  const start = parseIcsDate(dtstart.value);
  const end   = dtend ? parseIcsDate(dtend.value) : null;
  if (!start) return null;
  return {
    title: summary.replace(/\\,/g, ',').replace(/\\n/g, ' '),
    start: start.toISOString(),
    end: end ? end.toISOString() : null,
    allDay,
    uid: getProp(block, 'UID')?.value || null,
  };
}

export function parseTodo(block) {
  const summary = getProp(block, 'SUMMARY')?.value || '(no title)';
  const status  = getProp(block, 'STATUS')?.value || '';
  const due     = getProp(block, 'DUE')?.value;
  return {
    title: summary.replace(/\\,/g, ',').replace(/\\n/g, ' '),
    due: due ? parseIcsDate(due)?.toISOString() ?? null : null,
    uid: getProp(block, 'UID')?.value || null,
    completed: status.toUpperCase() === 'COMPLETED',
  };
}

// Extract <calendar-data> blobs from a multistatus, decoding entities.
export function extractCalendarData(xml) {
  const out = [];
  for (const resp of iterTags(xml, 'response')) {
    const blob = firstTag(resp, 'calendar-data');
    if (!blob) continue;
    const decoded = blob
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    out.push(unfold(decoded));
  }
  return out;
}

async function fetchEvents() {
  const disco = await discover();
  const cals = findCalendars(disco, process.env.ICLOUD_CALENDAR, 'VEVENT');
  if (!cals.length) {
    const available = disco.calendars
      .filter(c => c.comps.includes('VEVENT'))
      .map(c => c.name);
    throw new Error(
      `no calendar matched "${process.env.ICLOUD_CALENDAR}". ` +
      `Available VEVENT calendars: ${available.length ? available.join(', ') : '(none)'}. ` +
      `Set ICLOUD_CALENDAR=* to include all.`
    );
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 3600_000);
  const body = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${icalDate(now)}" end="${icalDate(horizon)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const events = [];
  await Promise.all(cals.map(async (cal) => {
    try {
      const r = await dav(cal.url, 'REPORT', body, { Depth: '1' });
      for (const ics of extractCalendarData(r.text)) {
        for (const block of iterComponents(ics, 'VEVENT')) {
          const ev = parseEvent(block);
          if (ev) { ev.calendar = cal.name; events.push(ev); }
        }
      }
    } catch (e) {
      console.error('[icloud] REPORT', cal.name, '→', String(e?.message || e));
    }
  }));
  events.sort((a, b) => a.start.localeCompare(b.start));
  return events.slice(0, 50);
}

async function fetchTodos({ raw = false } = {}) {
  const disco = await discover();
  const cals = findCalendars(disco, process.env.ICLOUD_REMINDERS, 'VTODO');
  if (!cals.length) {
    const available = disco.calendars
      .filter(c => c.comps.includes('VTODO'))
      .map(c => c.name);
    throw new Error(
      `no reminders list matched "${process.env.ICLOUD_REMINDERS}". ` +
      `Available VTODO lists: ${available.length ? available.join(', ') : '(none)'}. ` +
      `Set ICLOUD_REMINDERS=* to include all.`
    );
  }

  const reportBody = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VTODO"/>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:resourcetype/></d:prop></d:propfind>`;

  // For each list, try REPORT first, then PROPFIND + GET-each fallback.
  const perList = await Promise.all(cals.map(async (cal) => {
    const attempts = [];
    let reportResp = null;
    try {
      reportResp = await dav(cal.url, 'REPORT', reportBody, { Depth: '1' });
      attempts.push({ method: 'REPORT', length: reportResp.text.length });
    } catch (e) {
      attempts.push({ method: 'REPORT', error: String(e?.message || e) });
    }

    let propfindHrefs = [];
    if (!reportResp || extractCalendarData(reportResp.text).length === 0) {
      try {
        const pf = await dav(cal.url, 'PROPFIND', propfindBody, { Depth: '1' });
        for (const resp of iterTags(pf.text, 'response')) {
          const href = firstHref(resp);
          if (!href) continue;
          if (href.replace(/\/$/, '') === new URL(cal.url).pathname.replace(/\/$/, '')) continue;
          if (!/\.ics$/i.test(href)) continue;
          propfindHrefs.push(new URL(href, disco.base).href);
        }
        attempts.push({ method: 'PROPFIND', count: propfindHrefs.length });
      } catch (e) {
        attempts.push({ method: 'PROPFIND', error: String(e?.message || e) });
      }
    }

    const icsBlobs = [];
    if (reportResp) icsBlobs.push(...extractCalendarData(reportResp.text));
    if (icsBlobs.length === 0 && propfindHrefs.length) {
      const fetched = await Promise.all(propfindHrefs.slice(0, 200).map(async (u) => {
        try {
          const r = await fetchWithTimeout(u, {
            headers: { Authorization: authHeader(), Accept: 'text/calendar' },
          }, FETCH_TIMEOUT_MS);
          if (!r.ok) return '';
          return unfold(await r.text());
        } catch { return ''; }
      }));
      icsBlobs.push(...fetched.filter(Boolean));
      attempts.push({ method: 'GET-each', fetched: icsBlobs.length });
    }

    const todos = [];
    for (const ics of icsBlobs) {
      for (const block of iterComponents(ics, 'VTODO')) {
        const t = parseTodo(block);
        t.list = cal.name;
        todos.push(t);
      }
    }

    return { cal, attempts, reportResp, icsBlobs, todos };
  }));

  const todos = perList.flatMap(p => p.todos);
  const open = todos.filter(t => !t.completed);
  open.sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });

  if (raw) {
    return {
      lists: perList.map(p => ({
        name: p.cal.name,
        url: p.cal.url,
        attempts: p.attempts,
        icsBlobsCount: p.icsBlobs.length,
        reportRaw: p.reportResp ? p.reportResp.text.slice(0, 4000) : null,
        icsSample: p.icsBlobs[0] ? p.icsBlobs[0].slice(0, 2000) : null,
        todosTotal: p.todos.length,
      })),
      reportBody,
      todosTotal: todos.length,
      todosOpen: open.length,
    };
  }

  return open;
}

async function getCached(key, fn) {
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL_MS) return c.payload;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const payload = await fn();
    cache.set(key, { ts: Date.now(), payload });
    inflight.delete(key);
    return payload;
  })();
  inflight.set(key, p);
  try { return await p; } catch (e) { inflight.delete(key); throw e; }
}

function configured() {
  return !!(process.env.ICLOUD_USER && process.env.ICLOUD_APP_PASSWORD);
}

export function icloudMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/icloud/')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (!configured()) {
      return res.end(JSON.stringify({ state: 'idle' }));
    }

    try {
      if (req.url.startsWith('/api/icloud/events')) {
        if (!process.env.ICLOUD_CALENDAR) return res.end(JSON.stringify({ state: 'idle' }));
        const events = await getCached('events', fetchEvents);
        return res.end(JSON.stringify({ state: 'live', events }));
      }
      if (req.url.startsWith('/api/icloud/todos')) {
        if (!process.env.ICLOUD_REMINDERS) return res.end(JSON.stringify({ state: 'idle' }));
        if (req.url.includes('raw=1')) {
          const raw = await fetchTodos({ raw: true });
          return res.end(JSON.stringify({ state: 'debug', ...raw }, null, 2));
        }
        const todos = await getCached('todos', fetchTodos);
        return res.end(JSON.stringify({ state: 'live', todos }));
      }
      if (req.url.startsWith('/api/icloud/lists')) {
        // Diagnostic: list every calendar/reminders collection iCloud
        // exposes, with the displayname and supported components. Use
        // these names verbatim in ICLOUD_CALENDAR / ICLOUD_REMINDERS.
        const disco = await discover();
        return res.end(JSON.stringify({
          state: 'live',
          base: disco.base,
          principal: disco.principal,
          calendars: disco.calendars.map(c => ({ name: c.name, comps: c.comps, url: c.url })),
        }, null, 2));
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (e) {
      // Log full error server-side, return sanitized version to client
      // (CalDAV URLs can leak per-user host shards; auth failures expose
      // the user's principal path).
      console.error('[icloud]', req.url, '→', e?.message || e);
      res.statusCode = 502;
      res.end(JSON.stringify({ state: 'error', error: sanitizeError(e) }));
    }
  };
}

export function icloudPlugin() {
  return {
    name: 'icloud-caldav',
    configureServer(server)        { server.middlewares.use(icloudMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(icloudMiddleware()); },
  };
}
