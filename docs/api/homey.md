# Homey Pro — Cloud OAuth2 (via `homey-api` SDK)

Wired in this project. Server-side authorization-code flow + JWT session delegation handled by the official `homey-api` SDK in [src/server/homey-oauth.js](../../src/server/homey-oauth.js). Token state persists in `prefs.db` (key `homey:cloud_state`) via a custom `StorageAdapter`. The SDK auto-refreshes tokens.

The frontend doesn't talk to Athom directly — it calls **one structured endpoint**, [`/api/homey/snapshot`](#snapshot-shape), which the server populates by calling the SDK's manager methods (`zones.getZones`, `devices.getDevices`, `flow.getFlows`, etc.) and trims to a flat JSON shape.

## Why OAuth instead of PAT?
- The "Personal Access Token" on tools.developer.homey.app is **CLI-only** (for `homey app publish` in CI). The Manager API rejects it with `Missing Session ID in Token`.
- The LAN endpoint (`http://192.168.1.99/api/manager/...`) requires session-cookie auth (username/password login), not a Bearer.
- The cloud-routed URL (`https://${HOMEY_ID}.connect.athom.com`) accepts a session JWT, but obtaining one from a raw OAuth access token requires a multi-step delegation that the SDK does internally.

Conclusion: just use the SDK on the server, expose a single snapshot endpoint to the browser.

## Endpoints exposed by the plugin

| Path | Purpose |
|------|---------|
| `GET  /api/homey/oauth/login` | 302 → Athom authorize page (URL built by `cloudApi.getLoginUrl()`) |
| `GET  /api/homey/oauth/callback?code=` | SDK exchanges code, persists tokens, 302 → `/homey.html` |
| `GET  /api/homey/oauth/status` | `{ configured, authenticated }` — drives the UI banner |
| `POST /api/homey/oauth/logout` | clears state, drops cached cloud client + Homey session |
| `GET  /api/homey/snapshot` | live `{ system, zones, devices, flows }` (see shape below) |

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useHomey()` (calls only `/snapshot`) and [src/pages/homey/Homey.jsx](../../src/pages/homey/Homey.jsx) (`useHomeyAuth()` polls `/oauth/status` for the connect banner).

## Snapshot shape

```json
{
  "system": { "hostname": "...", "homeyVersion": "...", "uptime": ..., "memTotal": ..., ... },
  "zones": [
    { "id": "uuid", "name": "Salon", "parent": "uuid", "active": true }
  ],
  "devices": [
    {
      "id": "uuid", "name": "Salon spot 3", "zone": "uuid", "class": "light",
      "available": true, "ready": true,
      "capabilities": ["onoff", "dim", "light_hue", ...],
      "values": {
        "onoff": false, "dim": 0.32,
        "measure_power": null, "measure_temperature": null, "measure_humidity": null,
        "measure_battery": null, "target_temperature": null,
        "alarm_motion": null, "alarm_contact": null,
        "light_temperature": 0.65, "light_hue": 0, "light_saturation": 1
      }
    }
  ],
  "flows": [
    { "id": "uuid", "name": "Sunset Lights", "enabled": true, "broken": false, "type": "flow" },
    { "id": "uuid", "name": "Movie Night",   "enabled": true, "broken": false, "type": "advancedflow" }
  ]
}
```

Notes:
- `dim` is a 0..1 float. The hook converts to 0..100 in [hooks.js](../../src/lib/hooks.js).
- `class` values: `light`, `socket`, `thermostat`, `sensor`, `*sensor` (e.g. `motionsensor`), `lock`, `windowcoverings`, `doorbell`, `button`, `remote`, `speaker`, `tv`, `amplifier`, `heater`, `fan`, `vacuumcleaner`, `other`. Mapping → coarse dashboard type happens in `devClass()`.
- Only the capabilities we actually render are extracted into `values{}`. Add new ones to `serializeSnapshot()` in [homey-oauth.js](../../src/server/homey-oauth.js) when needed.
- `system` is currently `null` — the SDK manager name for system info isn't `homeyApi.system`; pending fix.

## Architecture

```
browser  ──GET /api/homey/snapshot──>  Vite dev server
                                       │
                                       ▼
                                 homeyOAuthMiddleware()
                                       │
                              uses    SDK (homey-api)
                                       │
                       ┌───────────────┼─────────────────┐
                       ▼               ▼                 ▼
              api.athom.com      <id>.connect.athom.com  prefs.db
              (OAuth + user)     (Manager API)           (token store)
```

- One `AthomCloudAPI` singleton per process, lazily instantiated.
- One `homeyApi` session per process, cached for 30 min, then re-derived (`user.getFirstHomey()` → `homey.authenticate()`).
- The session is invalidated on `/oauth/logout` and on snapshot errors (next request rebuilds it).

## Going live

1. Create OAuth2 app at <https://tools.developer.homey.app/> → "Apps" → "New OAuth2 Client".
2. Set the **Callback URL** on the Homey side to exactly:
   - `http://localhost:5173/api/homey/oauth/callback` (dev)
   - `https://dashboard.arylmera.duckdns.org/api/homey/oauth/callback` (prod, if hosted)
3. Fill `.env`:
   ```
   HOMEY_ID=<your-homey-id>
   HOMEY_CLIENT_ID=<from the OAuth2 app>
   HOMEY_CLIENT_SECRET=<from the OAuth2 app>
   HOMEY_REDIRECT_URI=http://localhost:5173/api/homey/oauth/callback
   ```
4. Restart `npm run dev`. Open `/homey.html`, click **Connect Homey** in the banner. Authorize → redirected back. Tokens persist in `prefs.db`.
5. After that, every page load streams live data from `/api/homey/snapshot` (poll: 30s).

If unconfigured / not yet authorized, the page falls back to mock zones + flows.

## Token model
- The SDK's `StorageAdapter.set()` is called whenever tokens change (initial exchange, refresh). Our `SqliteStorageAdapter` writes the full state object as JSON under one row in `prefs`.
- `autoRefreshTokens: true` (constructor option) means the SDK refreshes silently before expiry; we never deal with `expires_in` directly.
- If a refresh fails (revoked / network), the next `isLoggedIn()` returns false and the user re-authorizes via the banner.

## Pitfalls
- `homey-api` is published as both browser and Node — server-side use is fully supported but `getLoginUrl()` and `authenticateWithAuthorizationCode()` default to reading `window.location`. We pass `code` explicitly and use `removeCodeFromHistory: false` to avoid that.
- The `SqliteStorageAdapter` **must** extend `AthomCloudAPI.StorageAdapter` — the SDK does an `instanceof` check at construction time. A duck-typed `{ get, set }` object throws `Invalid 'store'`.
- `cloudApi.isLoggedIn()` does NOT make a network call; it checks the local store. To verify the token actually works, call `getAuthenticatedUser()`.
- The cloud session JWT for `<id>.connect.athom.com` has its own expiry, separate from the OAuth token. The SDK refreshes both transparently — but if the dashboard has been quiet >24h, the first request after wake-up may take a beat as the SDK rebuilds the session.
- `homeyApi.zones.getZones()` returns an **object keyed by zone ID**, not an array. Same for devices and flows. We `Object.values()` on the server before serializing.

## Reference
- SDK API: <https://athombv.github.io/node-homey-api/>
- SDK source: <https://github.com/athombv/node-homey-api>
- Developer portal: <https://tools.developer.homey.app/>
- WebSocket realtime (future, push instead of poll): `wss://${HOMEY_ID}.connect.athom.com/realtime/`

## SDK manager surface (under the hood)

When extending the snapshot or adding writes, these are the SDK methods we'd call. They map 1:1 to Athom's REST surface so you can also browse them in the Web API explorer at <https://tools.developer.homey.app/tools/api-playground>.

### Devices — `homeyApi.devices`
- `getDevices()` → `{ [id]: device }` (used in snapshot)
- `getDevice({ id })` — single device
- `setCapabilityValue({ deviceId, capabilityId, value })` — e.g. `onoff: true`, `dim: 0.6`, `target_temperature: 20.5`
- Common capabilities: `onoff`, `dim`, `light_hue`, `light_saturation`, `light_temperature`, `light_mode`, `measure_temperature`, `measure_humidity`, `measure_power`, `meter_power`, `measure_battery`, `alarm_motion`, `alarm_contact`, `alarm_battery`, `target_temperature`, `windowcoverings_state`. Always check the device's `capabilities[]` before reading/writing.
- Common classes: `light`, `socket`, `thermostat`, `heater`, `sensor`, `*sensor`, `button`, `remote`, `lock`, `windowcoverings`, `doorbell`, `speaker`, `tv`, `amplifier`, `vacuumcleaner`, `fan`, `other`.

### Zones — `homeyApi.zones`
- `getZones()` (used in snapshot) — `id`, `name`, `parent`, `icon`, `order`, `active` (motion in last X min)

### Flows — `homeyApi.flow`
- `getFlows()` — classic flows (used in snapshot)
- `getAdvancedFlows()` — advanced flows (used in snapshot)
- `triggerFlow({ id })` — run a flow on demand
- `enableFlow({ id })` / `disableFlow({ id })`

### Insights (timeseries) — `homeyApi.insights`
- `getLogs()` — list available logs (`uri`, `id`, `name`, `type`, `units`, `decimals`)
- `getLogEntries({ uri, id, resolution })` — `resolution`: `lastHour`, `last6Hours`, `last24Hours`, `last7Days`, `last14Days`, `last31Days`, `last3Months`, `last6Months`, `lastYear`, `last2Years`

### Energy — `homeyApi.energy`
- `getLiveReport()` — current power draw aggregate + per-device
- `getReport({ type: 'hour'|'day'|'month'|'year' })`

### System — `homeyApi.system` / users / presence / weather / notifications
- `getInfo()` — `homeyVersion`, `homeyModelName`, `wifiSsid`, `cpuUsage`, `memTotal`, `memFree`, `uptime`
- `getStorage()` — disk usage
- `homeyApi.users.getUsers()` / `getUserMe()`
- `homeyApi.presence.getPresences()` — geofence (who is home)
- `homeyApi.weather.getPlace()`
- `homeyApi.notifications.createNotification({ excerpt })` — push to Homey mobile app
- `homeyApi.speechOutput.say({ text })` — TTS via Homey speaker

### Apps — `homeyApi.apps`
- `getApps()` — installed Homey apps
- `restartApp({ id })`
- `getAppSetting({ id, key })` / `setAppSetting(...)`

### Realtime — WebSocket events
The SDK exposes events via `homeyApi.devices.connect()` etc. Underlying URL: `wss://${HOMEY_ID}.connect.athom.com/realtime/`. Useful events:
- `device.{id}.capability.{capId}` — capability change (push instead of poll)
- `device.{id}.update` — metadata change
- `flow.flow.{id}.trigger` — flow ran
- `notification.create`, `presence.update`

Switching to WS would make the dashboard sub-second-fresh and drop the 30s poll. Not wired yet.

## Pitfalls
- **Don't use the developer-portal "Personal Access Token"** — it's CLI-only and the API rejects it.
- `dim` is 0..1 float, not 0..100. Convert before display.
- `getZones`/`getDevices`/`getFlows` return objects keyed by ID. Server `Object.values()` before serializing.
- Zones are hierarchical via `parent`; root zones have `parent: null`. Build a tree if you want hierarchy.
- Capability IDs vary by device — read `capabilities[]` first. Many lights have `light_temperature` (a 0..1 cool/warm float, not Kelvin).
- The session JWT has its own expiry separate from the OAuth token. The SDK refreshes both, but if your dashboard wakes after a long idle the first request can be slow.
- Multiple Homeys on one account: by default we pick the first via `getFirstHomey()`. Set `HOMEY_ID` to target a specific one (the plugin does `getHomeyById({id})` first, falls back to first).
- Don't expose the snapshot endpoint publicly without auth — it leaks every device + flow on the home. The dev server is LAN-only by default; a prod reverse proxy should require its own auth in front.
