# Dashboard gap analysis — nice-to-haves for a home console

A survey of common features on self-hosted home dashboards (Homepage, Homarr,
Glance, Dashy, Heimdall, Organizr, Hubitat/HA Lovelace, Synology DSM home,
Homey insights), compared against what HomeDashboard already ships. Each gap
gets a short feasibility note tied to the stack we already run.

The bar for inclusion is the project's own design principle: **glance before
deep-read, cosy density, jump-off slightly dominant**. Anything that needs a
second glance to parse, or pushes the surface toward NOC/Grafana feel, is
dropped.

---

## What we already have

| Domain        | Surface                                                           |
|---------------|-------------------------------------------------------------------|
| Greeting      | Clock, weather (current temp/desc, Open-Meteo), greeting copy     |
| Search        | Fuzzy search across `SECTIONS` registry                           |
| Jump-off      | Page tiles (Plex / NAS / Homey / Quicklinks), pinned quick apps   |
| Status        | Live `useHealth` health checks, online/total, Tugtainer (legacy)  |
| Network       | Pi-hole DNS stats, Speedtest, TrueNAS interfaces                  |
| NAS           | TrueNAS pools/cpu/mem, Glances fallback                           |
| Media         | Plex sessions, Sonarr/Radarr queues, releases calendar (Plex page)|
| Smart Home    | Homey zones / devices / flows / variables (interactive)           |
| Storage hint  | Nextcloud quota                                                   |
| Docker        | Arcane stack page                                                 |
| Quicklinks    | Full service directory                                            |

---

## Gap matrix

Legend — Fit: how well it matches the design tone. Effort: implementation
difficulty given the existing stack. Priority: combined recommendation.

| # | Feature                                  | Fit  | Effort | Priority |
|---|------------------------------------------|------|--------|----------|
| 1 | Calendar (today + next 7 days)           | high | M      | **P0**   |
| 2 | Tasks / shopping list (shared)           | high | M      | **P0**   |
| 3 | Recently-added media strip               | high | S      | ✅ done  |
| 4 | Multi-day weather forecast               | high | S      | ✅ done  |
| 5 | Container updates digest (Tugtainer)     | high | S      | ✅ done  |
| 6 | Cert expiry tracker                      | med  | S      | P1       |
| 7 | WAN / internet up sentinel               | high | S      | ✅ done  |
| 8 | Energy / power tile (Homey)              | high | M      | P1       |
| 9 | Sensor digest (temp/humidity per zone)   | high | S      | ✅ done  |
|10 | TrueNAS health (SMART, scrub, snapshots) | high | M      | ✅ done  |
|11 | ntfy recent notifications                | med  | S      | P1       |
|12 | Music now-playing (Navidrome)            | med  | S      | P2       |
|13 | Sun / moon / golden-hour                 | med  | XS     | P2       |
|14 | Reading progress (Audiobookshelf)        | med  | S      | P2       |
|15 | Network clients online (Pi-hole/router)  | med  | M      | ✅ done  |
|16 | Birthdays (Nextcloud Contacts)           | med  | M      | P3       |
|17 | RSS / feed digest                        | low  | M      | P3       |
|18 | Bin / waste collection schedule          | med  | XS     | P3       |
|19 | Photo of the day / Immich frame          | med  | M      | drop?    |
|20 | Package tracking                         | low  | L      | drop     |

---

## P0 — recommended next batch

### 1. Calendar tile (today + week)

**Why** — household console without a calendar is incomplete; one of the most
universally requested home-dashboard widgets. Plays directly to the *Day-to-day*
purpose of the product.

**How (with what we have)** — Nextcloud is already deployed and proxied. CalDAV
exposes calendars at `/remote.php/dav/calendars/<user>/<cal>/`. Two routes:

- **Server-side aggregation** (preferred) — extend `src/server/` with a
  `calendar.js` route that pulls `tsdav` (or hand-rolled `REPORT` requests) and
  returns a flat JSON of events for the next 7 days. Cache 5 min.
- **iCal fallback** — Nextcloud calendars expose `?export` ICS URLs; parse with
  `ical.js`. Simpler but heavier.

Hook: `useCalendar({ poll = 5*60_000 })` returning `[{ title, start, end, allDay,
calendar }]`. Render as a small list on Home: "today" group + "this week".

**Pitfalls** — credentials must stay server-side (see `docs/vite.md`). Store
Nextcloud user + app-password in `.env`, expose via `/api/calendar/*` proxy.

---

### 2. Tasks / shopping list

**Why** — "is bread on the list?" is exactly the seconds-long ambient session
the product targets. Same household-shared use case as calendar.

**How** — Nextcloud Tasks (CalDAV `VTODO`) or Nextcloud Deck (REST). Deck has a
cleaner JSON API:

- `GET /index.php/apps/deck/api/v1.0/boards`
- `GET /index.php/apps/deck/api/v1.0/boards/{id}/stacks`

One pinned board ("Household") rendered as a checkable list. Toggling sends
`PUT` to mark a card done.

Hook: `useDeckBoard(boardId)`. Surface as a small card on Home, full page reuse
optional later.

**Pitfalls** — writes from the dashboard need user confirmation patterns
similar to Homey toggles already in place.

---

### 3. Recently-added media

**Why** — answers "anything new to watch tonight?" without opening Plex.

**How** — Tautulli already proxied. Endpoint:
`get_recently_added?count=10&media_type=movie,episode`. Returns thumbs + titles.

Hook: `useRecentlyAdded()`. New compact strip on Home below Quick apps, or a
section on the Plex page hero.

**Pitfalls** — thumbnail URLs need proxying through Tautulli to avoid CORS and
to add the API key server-side.

---

### 4. Multi-day weather forecast

**Why** — current `useWeather` only shows current temp. A 3-day mini-forecast
fits the hero card without changing layout.

**How** — Open-Meteo already used, no key needed. Add `&daily=temperature_2m_min,
temperature_2m_max,weather_code&forecast_days=3` to the existing call. Render
three tiny stacked rows next to current temp.

**Effort** — small. Code-only.

---

### 5. Container updates digest

**Why** — Tugtainer is in `monitoring` services but its data isn't surfaced.
"3 containers have updates" is a one-glance signal.

**How** — Tugtainer exposes JSON (check `docs/api/` or Tugtainer docs; likely
`/api/v1/images` or similar). Add a server route, hook `useContainerUpdates()`.
Show pending count next to Docker page tile stat block.

**Pitfalls** — verify Tugtainer's API surface; if not stable, fall back to
Arcane (already integrated via `useArcane`).

---

## P1 — useful, plan after P0

### 6. Cert expiry tracker

NPM (Nginx Proxy Manager) is already in `network`. Its API at
`/api/nginx/certificates` lists certs with `expires_on`. Server route → hook →
small "X certs · soonest in N days" stat. Warns at <14 d, alerts at <3 d.

### 7. WAN / internet sentinel

Speedtest gives bandwidth but not "is the WAN up right now". Cheap synthetic
check from the server: HEAD `https://1.1.1.1` and `https://9.9.9.9` every 30 s,
expose `/api/wan` returning `{ up, latencyMs }`. Surface as the leftmost dot in
the network panel.

### 8. Energy / power tile (Homey)

Homey exposes per-device `measure_power` and `meter_power` capabilities. Sum
across devices with that capability for a real-time household-W reading and a
daily-kWh number. Add to Homey page hero, mirror on Home as a small stat.

Existing `useHomey` hook already polls Homey; extend to compute aggregates.

### 9. Sensor digest

Same data source: Homey sensors with `measure_temperature` / `measure_humidity`.
Group by zone, render as a compact list on Homey page (and a "coldest /
warmest" line on Home). Reuses zone data already loaded.

### 10. TrueNAS health (SMART / scrub / snapshots)

`useTrueNAS` already pulls pool capacity. Extend the server proxy to also call:

- `/api/v2.0/disk/temperature` → SMART temps
- `/api/v2.0/pool/scrub` → last scrub status
- `/api/v2.0/replication` or `/api/v2.0/zfs/snapshot` → snapshot freshness

Surface a 3-dot health row under each pool bar (SMART · scrub · snap).

### 11. ntfy recent notifications

ntfy is in `smarthome` services. `/v1/messages?since=24h&topic=...` returns a
JSON stream. Server-side reader, last N messages on Home (or Homey page) as a
quiet feed.

---

## P2 — nice if cheap

- **Music now-playing (Navidrome)** — Subsonic API `getNowPlaying.view`.
- **Sun / moon / golden hour** — Open-Meteo `daily=sunrise,sunset` or
  `astral` server-side. Tiny addition to weather card.
- **Reading progress (Audiobookshelf)** — `useAudiobookshelf` hook exists but
  unused on Home. Show "currently reading: X · 47%".
- **Network clients online** — Pi-hole `network` API or Asus AiMesh. Number of
  active clients in last 5 min. Privacy: count only, no MACs on Home.

---

## P3 — defer

- **Birthdays** (Nextcloud Contacts CardDAV) — calendar may already cover via
  birthday calendar; revisit after #1.
- **RSS digest** — no reader currently in the stack. Adding one (e.g.
  FreshRSS) is a service decision, not a dashboard one.
- **Bin / waste collection** — region-specific (BE Wallonia from
  `50.50, 4.85`). Likely manual ICS feed from intercommunale; revisit if a
  reliable source is found.

## Drop / out of scope

- **Photo-of-the-day / Immich frame** — Immich isn't in the registry; adding a
  decorative photo widget pulls toward "Synology marketing" anti-reference.
- **Package tracking** — needs per-carrier scraping or 17track-style external
  service; not worth the secrets surface.

---

## Suggested execution order

1. Forecast extension (#4) — smallest, no new server route.
2. Container updates digest (#5) — thin server route, immediate signal.
3. Recently-added media (#3) — Tautulli already proxied.
4. Calendar (#1) — first new server route with credentials, sets pattern.
5. Tasks (#2) — reuses Nextcloud auth from #1.
6. WAN sentinel (#7), cert expiry (#6).
7. Energy + sensors (#8, #9) — both ride existing Homey hook.
8. TrueNAS health (#10), ntfy feed (#11).

Each step is small enough to ship independently and rollback per page.

---

## Open questions for the operator

- **Nextcloud credentials** — app-password ready, or use existing one?
- **Households visible to family** — does the calendar/tasks view need ACL
  filtering, or is "household" calendar already shared appropriately?
- **Energy on Home page** — kWh today, or instantaneous W, or both?
- **Recently-added scope** — Plex only, or include Audiobookshelf and
  Navidrome on the same strip?
