# TrueNAS SCALE — REST API v2.0

Base: `${VITE_TRUENAS_URL}/api/v2.0` · Auth: `Authorization: Bearer <API_KEY>` (proxy injects it; key never reaches browser).

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useTrueNAS()`. Proxy: `/api/truenas/*` → upstream (see [vite.config.js](../../vite.config.js)).

## Endpoints we use

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/system/info` | GET | `hostname`, `version`, `physmem` (bytes), `uptime_seconds`, `cores`, `loadavg`, `model` |
| `/pool` | GET | array of pools — `name`, `healthy` (bool), `status`, `size`, `allocated`, `free`, `topology` (data/cache/log/spare vdev tree with disk paths) |
| `/reporting/get_data` | POST | timeseries — body: `[{name:"cpu"},{name:"memory"},{name:"interface",identifier:"eno1"}]`. Returns `{legend, data:[[t, ...values]], start, end}` per query |

## Endpoints worth adding

### Disks (replace Glances `fs` for physical drives)
| Endpoint | Returns |
|----------|---------|
| `GET /disk` | physical disks: `name` (sda…), `devname`, `serial`, `model`, `size`, `type` (HDD/SSD/NVME), `rotationrate`, `pool`, `description`, `enclosure` |
| `POST /disk/temperatures` body `{names:["sda","sdb"]}` | `{sda: 34, sdb: 37}` °C |
| `POST /disk/temperature_alerts` | active SMART temp alerts |
| `GET /smart/test/results` | SMART self-test history per disk |

### Datasets / shares
| Endpoint | Returns |
|----------|---------|
| `GET /pool/dataset` | datasets — `name`, `mountpoint`, `used.parsed`, `available.parsed`, `quota.parsed`, `compression`, `compressratio`, `encrypted`, `type`, `children[]` |
| `GET /pool/dataset/id/{name}` | single dataset (URL-encode `pool/child`) |
| `GET /sharing/smb` | SMB shares |
| `GET /sharing/nfs` | NFS exports |
| `GET /sharing/iscsi/target` | iSCSI targets |

### Snapshots / replication / backups
| `GET /zfs/snapshot` | snapshots (paginate with `limit`/`offset`) |
| `GET /pool/snapshottask` | scheduled snapshot tasks |
| `GET /replication` | replication tasks + state |
| `GET /cloudsync` | cloud sync tasks |
| `GET /rsynctask` | rsync tasks |

### Network
| `GET /interface` | interfaces — `name`, `state.aliases`, `state.link_state`, `state.speed`, `mtu`, `state.received_bytes`, `state.sent_bytes` |
| `GET /network/configuration` | hostname, gateway, nameservers |
| `POST /reporting/get_data` `{name:"interface", identifier:"eno1"}` | rx/tx timeseries |

### Services / system
| `GET /service` | running services (smbd, nfs, ssh, ups, …) — `state`, `enable` |
| `GET /alert/list` | active alerts (use to surface health badge) |
| `GET /system/general` | timezone, language, kbdmap |
| `GET /update/check_available` | pending updates |
| `GET /jail` (Core only) / `GET /chart/release` (SCALE TrueCharts) | apps |
| `GET /virt/instance` (24.10+) / `GET /vm` (legacy) | VMs |
| `GET /ups` | UPS status if configured |
| `GET /system/advanced` | advanced settings |

### Reporting metrics names (`/reporting/get_data`)
`cpu`, `cputemp`, `memory`, `swap`, `load`, `uptime`, `interface` (+`identifier`), `disk` (+`identifier:"sda"`), `disktemp` (+`identifier`), `arcsize`, `arcratio`, `arcresult`, `df` (+`identifier:"mnt-pool-dataset"`), `processes`, `nfsstat`, `ctl` (iSCSI).

Time window via `{start, end, prefer_user_units}` next to `name` block.

## Auth gotchas
- Bearer key from web UI (Credentials → API Keys). Cannot be viewed again after creation.
- Sessions also work via `/auth/login` but stateful — Bearer is simpler for proxy.
- 401 → key revoked / wrong scope. 403 → key has insufficient privilege (older keys are tied to a user; user must have admin).
- WebSocket API at `wss://host/websocket` is the canonical surface; REST is a thin shim. Some calls (long-running, like `pool.scrub`) only return job IDs — poll `/core/get_jobs?id={id}`.

## Pitfalls
- `/pool/dataset` returns nested children — flatten before display.
- `physmem` is bytes; `size`/`allocated` on `/pool` are **strings** of bytes (cast with `+x`).
- `/reporting/get_data` legend order matters; always look up index by name (`legend.indexOf("idle")`).
- Network identifier is the kernel name (`eno1`, `enp3s0`), not the alias. Pull from `/interface` first.
- `/disk` does not include real-time temps — must POST `/disk/temperatures` separately. Cache; SMART hits the drive.
- TrueNAS 25.04 (Fangtooth) is migrating to a new HTTP API namespace (`/api/v3`). v2.0 will remain for a while but check release notes when upgrading.

## Reference
- Swagger UI on box: `https://<truenas>/api/docs/`
- Source: <https://github.com/truenas/middleware>
