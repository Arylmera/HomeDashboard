# iCloud — CalDAV (calendars + reminders)

Base: `https://caldav.icloud.com` · Auth: HTTP Basic (Apple ID + **app-specific password**).

Server-side middleware in [src/server/icloud.js](../../src/server/icloud.js) handles discovery, cross-host redirects, and `REPORT` queries. Browser only sees parsed JSON via `/api/icloud/*`.

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useCalendar()`, `useReminders()`.

## Endpoints (local proxy, JSON)

| Path | Returns |
|------|---------|
| `GET /api/icloud/events` | `{ state, events:[{title,start,end,allDay,uid}] }` (next 7d, ≤50) |
| `GET /api/icloud/todos`  | `{ state, todos:[{title,due,uid,completed}] }` (open VTODOs) |

`state` is `"idle"` (env not set), `"live"`, or `"error"`. On error a `502` is returned with `{state:"error", error}`.

## Env

```
ICLOUD_USER=you@example.com           # Apple ID
ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx    # appleid.apple.com → Sign-in & Security → App-specific Passwords
ICLOUD_CALENDAR=*                     # "*"/"all" = every calendar, "Home,Work" = a list, "Home" = one
ICLOUD_REMINDERS=*                    # "*"/"all" = every list, "Rappels,Courses" = a list, "Rappels" = one
```

All four are server-only — **never use `VITE_*`** for these (would bake secrets into the bundle).

## How discovery works

1. `PROPFIND /` on `caldav.icloud.com` with `<current-user-principal/>`. Apple redirects to a per-user host like `pXX-caldav.icloud.com`. Final URL is taken from `response.url`.
2. `PROPFIND` on the principal href for `<calendar-home-set/>`.
3. `PROPFIND` (Depth: 1) on the home for the list of calendars + `<displayname/>` + `<supported-calendar-component-set/>` (so we can tell `VEVENT` calendars from `VTODO` reminders lists).
4. Match by `displayname` (case-insensitive), with comp preference (`VEVENT` for events, `VTODO` for reminders).

Discovery is cached for 6h. Event/todo responses cached 60s with single-flight dedupe.

## Queries

Events — CalDAV `REPORT calendar-query` with a time-range filter on `VEVENT`:

```xml
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="..." end="..."/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>
```

Todos — same shape with `<c:comp-filter name="VTODO"/>` and no time-range. Completed VTODOs are filtered out server-side after parsing (iCloud's filter language doesn't expose `STATUS` cleanly).

## Pitfalls

- **App-specific password required.** Plain Apple ID password fails when 2FA is on (it always is now). Generate at <https://appleid.apple.com> → Sign-in & Security → App-Specific Passwords.
- **Per-user host.** Never hardcode `caldav.icloud.com` in REPORT URLs — always start from discovery, since calendar URLs live on `pXX-caldav.icloud.com`.
- **REPORT is not GET.** Don't try to wire this through Vite's static `server.proxy` — REPORT method + redirect across hosts isn't expressible there. Use the middleware.
- **Recurring events.** REPORT with `<time-range>` *expands* recurrences into the response — but only when the event has `RRULE`. Single events outside the window are filtered server-side too.
- **All-day events** come as `VALUE=DATE` (`20260502`), no time. Detect via the `DTSTART` parameter, not value length.
- **Completion semantics.** A reminder counts as done when `STATUS:COMPLETED` is set (or `COMPLETED:` timestamp). Don't rely on `PERCENT-COMPLETE`.
- **Line folding.** RFC 5545 folds long lines; unfold (`\r?\n[ \t]` → `''`) before regex parsing.

## Reference

- iCloud CalDAV (unofficial overview): <https://www.calendarserver.org>
- RFC 4791 (CalDAV): <https://datatracker.ietf.org/doc/html/rfc4791>
- RFC 5545 (iCalendar): <https://datatracker.ietf.org/doc/html/rfc5545>
- App-specific passwords: <https://support.apple.com/en-us/102654>
