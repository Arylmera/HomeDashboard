# Glances — REST API v4

Base: `${VITE_GLANCES_URL}/api/4` · No auth (LAN-only). Proxy: `/api/glances/*` → upstream.

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useGlances()`.

## Plugins we use
| Path | Returns |
|------|---------|
| `/cpu` | `total`, `user`, `system`, `idle`, `iowait`, `irq`, `nice`, `steal`, `ctx_switches` |
| `/percpu` | per-core array — `cpu_number`, `total`, `user`, `system`, `idle` |
| `/mem` | `total`, `used`, `free`, `available`, `buffers`, `cached`, `percent` |
| `/sensors` | array of `{label, type, value, unit, warning, critical}` — type ∈ `temperature_core`, `fan_speed`, `battery` |
| `/network` | per-iface `{interface_name, bytes_recv, bytes_sent, bytes_recv_rate_per_sec, bytes_sent_rate_per_sec, speed, is_up}` |
| `/fs` | per-mount `{device_name, mnt_point, size, used, free, percent, fs_type}` — **only mounts visible inside the Glances process namespace** |

## Other useful plugins
| `/load` | `min1`, `min5`, `min15`, `cpucore` |
| `/memswap` | swap |
| `/processcount` | `total`, `running`, `sleeping`, `thread` |
| `/processlist` | top processes — `pid`, `name`, `cpu_percent`, `memory_percent`, `username`, `cmdline`, `io_counters` |
| `/diskio` | per-disk `{disk_name, read_bytes, write_bytes, read_count, write_count}` (rates use `_rate_per_sec`) |
| `/uptime` | seconds string |
| `/system` | `os_name`, `os_version`, `hostname`, `platform`, `linux_distro` |
| `/now` | server-side timestamp |
| `/ip` | public + private IPs |
| `/docker` (or `/containers`) | container stats — only if Glances has `docker.sock` mounted |
| `/gpu` | per-GPU `{name, mem, proc, temperature, power}` (NVIDIA via NVML, AMD via ROCm) |
| `/smart` | SMART attributes per drive — needs `--full` image + `SYS_RAWIO` cap + `/dev` |
| `/raid` | mdadm arrays |
| `/folders` | size of configured folders (configured via glances.conf) |
| `/connections` | TCP/UDP connection counts |
| `/wifi` | wifi signal/quality |
| `/quicklook` | compact dashboard payload — useful for low-poll overview |
| `/ports` | reachability checks (configured in glances.conf) |
| `/alert` | active alert list |

## Server-side filters
- Single field: `/api/4/cpu/total` → just that key.
- Time range: `/api/4/cpu/history/60` → last 60s of values.
- All in one call: `/api/4/all` (heavy — avoid in poll loops).
- List plugins: `/api/4/pluginslist`.

## Container mapping (so plugins see real host)
Glances in a container only sees what's namespaced to it. To make `/fs`, `/diskio`, `/sensors`, `/processlist` reflect the host:
```yaml
pid: host
network_mode: host
privileged: true              # or specific caps: SYS_PTRACE, SYS_ADMIN, SYS_RAWIO
volumes:
  - /:/rootfs:ro,rslave
  - /var/run/docker.sock:/var/run/docker.sock:ro
  - /run/udev:/run/udev:ro
environment:
  GLANCES_OPT: "-w"
```
Without `pid: host`, `/processlist` shows only PID 1 (Glances itself). Without `/:/rootfs`, `/fs` shows overlay/tmpfs only.

## Pitfalls
- v3 path was `/api/3/...`. v4 is current. Check `glances --version`.
- Rate fields (`*_rate_per_sec`) are computed since last poll — first request returns 0.
- `fs.fs_type` for ZFS shows `zfs`; mount point is dataset path (`/mnt/pool/share`).
- `/sensors` labels are vendor-specific (`Package id 0`, `Tdie`, `Composite`, `nvme`). Filter by `label.startsWith("Core ")` for per-core, or `type === "temperature_core"`.
- Glances writes its own InfluxDB/Prometheus exports if configured — for long-term history prefer that over polling Glances directly.

## Reference
- Docs: <https://glances.readthedocs.io/>
- API: <https://glances.readthedocs.io/en/latest/api.html>
- Image: `nicolargo/glances:latest-full` (slim variant lacks SMART/GPU plugins)
