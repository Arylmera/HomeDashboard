# Spotify Web API

Base (server proxy): `/api/spotify/v1/*` → `https://api.spotify.com/v1/*`
OAuth endpoints: `/api/spotify/oauth/{login,callback,status,logout}`

## Auth

Authorization Code flow. Tokens persist in `$PREFS_DB` under key `spotify:tokens`.
Server middleware ([src/server/spotify-oauth.js](../../src/server/spotify-oauth.js)) auto-refreshes when `expires_at` is within 60 s.

Required env (server-side, **not** `VITE_*`):

```
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI    # must match the app dashboard exactly
```

App registration: <https://developer.spotify.com/dashboard>. Add the redirect URI to **Edit settings → Redirect URIs** before authorizing.

Authorize once by visiting `/api/spotify/oauth/login` in the browser. The middleware redirects to `/music.html` after a successful callback.

## Scopes requested

```
user-read-private user-read-email
user-read-playback-state user-modify-playback-state user-read-currently-playing
playlist-read-private playlist-read-collaborative
streaming
```

## Endpoints used

| Path                                      | Method | Purpose |
|-------------------------------------------|--------|---------|
| `/v1/me/player`                            | GET    | Current playback (track, device, progress) |
| `/v1/me/player`                            | PUT    | Transfer playback to a device |
| `/v1/me/player/devices`                    | GET    | List Spotify Connect devices |
| `/v1/me/player/play`                       | PUT    | Start/resume — `{context_uri}` or `{uris}` |
| `/v1/me/player/pause`                      | PUT    | Pause |
| `/v1/me/player/next` / `/previous`         | POST   | Skip |
| `/v1/me/player/seek?position_ms=`          | PUT    | Seek |
| `/v1/me/player/volume?volume_percent=`     | PUT    | Volume |
| `/v1/me/player/shuffle?state=`             | PUT    | Shuffle |
| `/v1/me/player/repeat?state=`              | PUT    | Repeat (`off|track|context`) |
| `/v1/search?q=&type=&limit=`               | GET    | Search |
| `/v1/me/playlists`                         | GET    | User playlists |

All driven by [src/lib/hooks/spotify.js](../../src/lib/hooks/spotify.js).

## Pitfalls

- **Premium required** for all `/me/player/*` mutations. Free accounts get `403 PREMIUM_REQUIRED`.
- `GET /me/player` returns **204 No Content** when nothing is playing — handle as `playback: null`.
- Spotify Connect device list is volatile: a Sonos speaker only appears after the Spotify app has played to it at least once. Once registered, it persists across restarts.
- `transfer` (`PUT /me/player`) takes ~1 s to settle. Refresh playback after a short delay.
- Redirect URI must match **byte-for-byte** including trailing slash. Common 400 cause.
- **HTTPS is mandatory** for the redirect URI. The only http exception is loopback `http://127.0.0.1[:port]/...`. For dev, either enable Vite HTTPS (`server.https = true` with a self-signed cert) or use `http://127.0.0.1:5173/...` instead of `localhost`.
- Tokens last 1 h; refresh tokens are long-lived but invalidate when user revokes access at <https://www.spotify.com/account/apps/>.

## Reference

- API docs: <https://developer.spotify.com/documentation/web-api>
- Auth flow: <https://developer.spotify.com/documentation/web-api/tutorials/code-flow>
