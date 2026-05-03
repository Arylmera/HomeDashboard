# WAN sentinel — `/api/wan`

Synthetic "is the internet up *right now*?" probe. Implemented entirely
server-side in `src/server/wan.js` and registered as a Vite middleware in
`vite.config.js` (`wanPlugin()`).

Speedtest-tracker reports bandwidth — but only at the cadence it runs (every
few hours). The WAN sentinel fills the gap with a continuous reachability
signal that the dashboard can render as a single dot.

## Probe

Two anycast endpoints are checked in parallel:

| Target              | URL                                       |
|---------------------|-------------------------------------------|
| Cloudflare 1.1.1.1  | `https://1.1.1.1/cdn-cgi/trace`           |
| Quad9 9.9.9.9       | `https://9.9.9.9/`                        |

Any HTTP response (including 4xx/5xx) counts as "WAN reached the host" → up.
Both probes failing or timing out (4 s) → down.

## Caching

- Result cached for **30 s** (`PROBE_TTL_MS`). Concurrent requests share the
  in-flight probe; only one network round-trip per TTL.
- Returned `latencyMs` is the fastest successful target's RTT.

## Response

```http
GET /api/wan
```

```json
{
  "state": "live",
  "up": true,
  "latencyMs": 17,
  "when": 1735834293000,
  "target": "cloudflare"
}
```

`state` is `"live"` on a normal response and `"error"` on probe-side failure
(rare — the probe itself swallows network errors and reports `up: false`).

## Hook

`useWan({ poll = 30_000 })` from `src/lib/hooks/wan.js`. Returns the same
shape as the response with a `state` field. Polling matches the cache TTL,
so the hook never serves a stale-then-instantly-fresh value.

## Surfaces

- **Network page** — first stat in the `docker-banner` row (label "WAN",
  value `up`/`down`, unit shows latency or target name).
- **Home page** — small status dot next to the "ISP · Speedtest" card title
  in `NetworkPanel`, plus a `WAN N ms` chip in the sub-line.

## Operational notes

- No env vars; the targets are hard-coded anycast IPs.
- The probe runs from the dashboard's host. If that host has its own
  network problem the WAN dot will read down even when the upstream is fine
  — this is a feature, not a bug, since the dashboard *is* down for users.
- Outbound `https://1.1.1.1` and `https://9.9.9.9` must be allowed by the
  firewall. Most home setups already allow these.
