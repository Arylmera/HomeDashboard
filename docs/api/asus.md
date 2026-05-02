# ASUS router (Asuswrt) — SSH backend (ssh2 npm lib)

Pure-JS SSH client. Supports password or key authentication. No
external `ssh` binary required. Survives firmware updates.

## Setup

Router admin → `Administration > System`:
- Enable SSH = `LAN only`
- SSH Port = `1024` (or your preferred port)
- Allow Password Login = `Yes` (if using password auth)

For key auth: paste your `*.pub` into Authorized Keys, set Allow
Password Login = `No` for stricter security.

## Env

```
VITE_ASUS_URL=http://192.168.1.1
ASUS_SSH_HOST=192.168.1.1   # optional, falls back to VITE_ASUS_URL host
ASUS_SSH_PORT=1024
ASUS_USERNAME=Admin         # case-sensitive
ASUS_PASSWORD=•••           # OR
ASUS_SSH_KEY=C:\Users\…\id_ed25519
```

## Remote command

A single batched script reads everything in one connection. Parsed
sections (each prefixed by `##<name>` markers in stdout):

| Marker        | Source                  | Used for |
|---------------|-------------------------|----------|
| `model`       | `nvram get productid`   | display name |
| `firmver/buildno/extendno` | `nvram get …` | firmware string |
| `wan_state`   | `nvram get wan0_state_t` (`2` = connected) | WAN up/down |
| `wan_proto/ip/gw/dns` | `nvram get wan0_*`         | WAN details |
| `uptime`      | `cat /proc/uptime`      | seconds since boot |
| `loadavg`     | `cat /proc/loadavg`     | 1/5/15 min load |
| `meminfo`     | `cat /proc/meminfo`     | MemTotal / MemAvailable |
| `stat1`/`stat2` | `head -n 1 /proc/stat` × 2 with `sleep 1` | CPU % delta |
| `arp`         | `cat /proc/net/arp`     | client count (online / wired / wifi) |

## Project wiring

- Server: [src/server/asus.js](../../src/server/asus.js) — spawns `ssh`,
  caches result for 15 s, 60 s backoff on errors.
- Hook: [src/lib/hooks/asus.js](../../src/lib/hooks/asus.js).
- UI: router panel on the Network page, between Speedtest and NPM.

## Troubleshooting

- `Permission denied (publickey)` → key not authorized in router admin.
- `Host key verification failed` → run `ssh -p <port> <user>@<host>`
  once on the dashboard host to populate `known_hosts`.
- `BatchMode` is on, so any password prompt = immediate failure (good —
  surfaces the misconfig instead of hanging).
