import { useState, useEffect, useMemo } from 'react';

/* ================================================================ *
 *  Hooks for live data.
 *
 *  All fetches go through Vite proxies at /api/<service>/*; the dev
 *  server (and any prod reverse-proxy) injects auth headers from
 *  .env so credentials never reach the browser.
 *
 *  When the upstream URL/key is missing, fetches fail fast and
 *  hooks return null/empty — pages render gracefully.
 * ================================================================ */

// ─── Clock + greeting ──────────────────────────────────────────
export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useGreeting() {
  return useMemo(() => {
    const h = new Date().getHours();
    if (h < 5)  return "Late night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Late night";
  }, []);
}

// ─── Weather (Open-Meteo, no key) ──────────────────────────────
function weatherDesc(c) {
  if (c === 0) return "clear";
  if (c <= 3) return "partly cloudy";
  if (c <= 48) return "fog";
  if (c <= 67) return "rain";
  if (c <= 77) return "snow";
  if (c <= 82) return "showers";
  if (c <= 99) return "storm";
  return "—";
}

export function useWeather() {
  const [w, setW] = useState({ temp: "—", code: 0, desc: "—", daily: [] });
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=50.50&longitude=4.85&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=4&timezone=auto")
      .then(r => r.json())
      .then(j => {
        const t = j?.current?.temperature_2m;
        const c = j?.current?.weather_code;
        const d = j?.daily;
        const daily = (d?.time || []).slice(1, 4).map((iso, i) => ({
          date: iso,
          max: d.temperature_2m_max?.[i + 1] != null ? Math.round(d.temperature_2m_max[i + 1]) : null,
          min: d.temperature_2m_min?.[i + 1] != null ? Math.round(d.temperature_2m_min[i + 1]) : null,
          code: d.weather_code?.[i + 1],
          desc: weatherDesc(d.weather_code?.[i + 1]),
        }));
        setW({ temp: t != null ? Math.round(t) : "—", code: c, desc: weatherDesc(c), daily });
      })
      .catch(() => {});
  }, []);
  return w;
}

// ─── tiny generic JSON fetcher ─────────────────────────────────
async function getJson(url, init = {}) {
  const r = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ─── TrueNAS ───────────────────────────────────────────────────
const TN_BASE = "/api/truenas/api/v2.0";
async function tn(path, init = {}) {
  return getJson(`${TN_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

export function useTrueNAS({ poll = 30_000 } = {}) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [sys, pools, reporting] = await Promise.all([
          tn("/system/info"),
          tn("/pool"),
          tn("/reporting/get_data", {
            method: "POST",
            body: JSON.stringify([{ name: "cpu" }, { name: "memory" }, { name: "interface", identifier: "eno1" }]),
          }).catch(() => null),
        ]);
        if (!alive) return;

        // CPU
        const cpuSeries = reporting?.[0];
        let cpuSpark = [], cpuPct = null;
        if (cpuSeries?.data?.length) {
          const idleIdx = cpuSeries.legend.indexOf("idle");
          const usage = cpuSeries.data.map(row => 100 - (row[idleIdx] ?? 0));
          const step = Math.max(1, Math.floor(usage.length / 32));
          for (let i = 0; i < usage.length; i += step) cpuSpark.push(usage[i]);
          cpuPct = Math.round(usage.at(-1));
        }
        // Memory
        const memSeries = reporting?.[1];
        let memUsed = null, memSpark = [];
        if (memSeries?.data?.length) {
          const usedIdx = memSeries.legend.indexOf("used");
          memUsed = memSeries.data.at(-1)[usedIdx] ?? null;
          const step = Math.max(1, Math.floor(memSeries.data.length / 32));
          for (let i = 0; i < memSeries.data.length; i += step) memSpark.push(memSeries.data[i][usedIdx] ?? 0);
        }
        // Network
        const netSeries = reporting?.[2];
        let rx = 0, tx = 0, rxSpark = [], txSpark = [];
        if (netSeries?.data?.length) {
          const rxI = netSeries.legend.indexOf("received");
          const txI = netSeries.legend.indexOf("sent");
          netSeries.data.forEach(row => {
            rxSpark.push(row[rxI] ?? 0);
            txSpark.push(row[txI] ?? 0);
          });
          const last = netSeries.data.at(-1);
          rx = last[rxI] ?? 0;
          tx = last[txI] ?? 0;
        }

        setData({
          system: sys,
          cpuPct, cpuSpark,
          memUsed, memSpark, memTotal: sys.physmem,
          netRx: rx, netTx: tx,
          rxSpark: rxSpark.slice(-32), txSpark: txSpark.slice(-32),
          uptime: sys.uptime_seconds,
          pools: (pools || []).map(p => ({
            name: p.name,
            healthy: p.healthy,
            status: p.status,
            used: +p.allocated || 0,
            total: +p.size || 0,
            pct: p.size ? Math.round(((+p.allocated || 0) / (+p.size)) * 100) : 0,
            topology: p.topology,
          })),
        });
        setState("live");
      } catch (e) {
        console.warn("[truenas]", e);
        if (alive) setState("error");
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return { data, state };
}

// ─── Glances v4 (no auth) ──────────────────────────────────────
export function useGlances({ poll = 15_000 } = {}) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [cpu, mem, fs, sensors, network, percpu] = await Promise.all([
          getJson("/api/glances/api/4/cpu").catch(() => null),
          getJson("/api/glances/api/4/mem").catch(() => null),
          getJson("/api/glances/api/4/fs").catch(() => null),
          getJson("/api/glances/api/4/sensors").catch(() => null),
          getJson("/api/glances/api/4/network").catch(() => null),
          getJson("/api/glances/api/4/percpu").catch(() => null),
        ]);
        if (!alive) return;
        if (!cpu && !mem) { setState("error"); return; }
        setData({ cpu, mem, fs, sensors, network, percpu });
        setState("live");
      } catch (e) {
        if (alive) setState("error");
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return { data, state };
}

// ─── Plex ──────────────────────────────────────────────────────
export function usePlex({ poll = 30_000 } = {}) {
  const [data, setData] = useState({ sessions: null, libraries: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [sess, libs] = await Promise.all([
          getJson("/api/plex/status/sessions").catch(() => null),
          getJson("/api/plex/library/sections").catch(() => null),
        ]);
        const dirs = libs?.MediaContainer?.Directory ?? [];
        // /library/sections does not return item counts — fetch totalSize per section.
        const counts = await Promise.all(dirs.map(d =>
          getJson(`/api/plex/library/sections/${d.key}/all?X-Plex-Container-Size=0&X-Plex-Container-Start=0`)
            .then(r => r?.MediaContainer?.totalSize ?? 0)
            .catch(() => 0)
        ));
        const enriched = dirs.map((d, i) => ({ ...d, count: counts[i] }));
        if (!alive) return;
        setData({
          sessions: sess?.MediaContainer ?? null,
          libraries: enriched,
          state: sess ? "live" : "error",
        });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── *arr queue + calendar ─────────────────────────────────────
export function useArr(svc, { poll = 60_000 } = {}) {
  const [data, setData] = useState({ queue: null, calendar: null, status: null, missing: null, total: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const next30 = new Date(today.getTime() + 30 * 86400 * 1000);
        const libPath = svc === "sonarr" ? "series" : svc === "radarr" ? "movie" : "artist";
        const [queue, calendar, status, missing, library] = await Promise.all([
          getJson(`/api/${svc}/api/v3/queue?pageSize=10&includeUnknownSeriesItems=true`).catch(() => null),
          getJson(`/api/${svc}/api/v3/calendar?start=${today.toISOString()}&end=${next30.toISOString()}&unmonitored=true${svc === 'sonarr' ? '&includeSeries=true' : ''}`).catch(() => null),
          getJson(`/api/${svc}/api/v3/system/status`).catch(() => null),
          getJson(`/api/${svc}/api/v3/wanted/missing?pageSize=1`).catch(() => null),
          getJson(`/api/${svc}/api/v3/${libPath}`).catch(() => null),
        ]);
        if (!alive) return;
        setData({
          queue,
          calendar,
          status,
          missing: missing?.totalRecords ?? null,
          total: Array.isArray(library) ? library.length : null,
          state: status ? "live" : "error",
        });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [svc, poll]);
  return data;
}

// ─── Qui (qBittorrent dashboard, multi-instance aggregator) ────
export function useQui({ poll = 15_000 } = {}) {
  const [data, setData] = useState({ instances: null, dl: 0, up: 0, active: 0, total: 0, state: 'loading' });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const instances = await getJson('/api/qui/api/instances');
        if (!Array.isArray(instances)) throw new Error('bad instances payload');
        // Skip instances Qui can't currently reach — calls would just error.
        const reachable = instances.filter(i => i.connected !== false);
        const perInstance = await Promise.all(reachable.map(async (inst) => {
          const id = inst.id ?? inst.ID;
          const [stats, torrents] = await Promise.all([
            getJson(`/api/qui/api/instances/${id}/stats`).catch(() => null),
            getJson(`/api/qui/api/instances/${id}/torrents`).catch(() => null),
          ]);
          return { stats, torrents };
        }));
        if (!alive) return;
        let dl = 0, up = 0, active = 0, total = 0;
        for (const { stats, torrents } of perInstance) {
          if (stats) {
            dl += stats.dl_info_speed ?? stats.dlInfoSpeed ?? 0;
            up += stats.up_info_speed ?? stats.upInfoSpeed ?? 0;
          }
          // /torrents may return an array directly or `{ torrents: [...] }` /
          // `{ items: [...] }` — handle every plausible shape.
          const list = Array.isArray(torrents)
            ? torrents
            : Array.isArray(torrents?.torrents)
              ? torrents.torrents
              : Array.isArray(torrents?.items)
                ? torrents.items
                : torrents && typeof torrents === 'object'
                  ? Object.values(torrents)
                  : [];
          total += list.length;
          for (const t of list) {
            if ((t?.dlspeed || 0) + (t?.upspeed || 0) > 0) active++;
          }
        }
        setData({ instances, dl, up, active, total, state: 'live' });
      } catch { if (alive) setData(d => ({ ...d, state: 'error' })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── Tautulli ──────────────────────────────────────────────────
export function useTautulli({ poll = 30_000 } = {}) {
  const [data, setData] = useState({ home: null, activity: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [home, act] = await Promise.all([
          getJson("/api/tautulli/api/v2?cmd=get_home_stats&time_range=7&stats_count=5").catch(() => null),
          getJson("/api/tautulli/api/v2?cmd=get_activity").catch(() => null),
        ]);
        if (!alive) return;
        setData({
          home: home?.response?.data ?? null,
          activity: act?.response?.data ?? null,
          state: act ? "live" : "error",
        });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── Seerr / Overseerr ─────────────────────────────────────────
export function useSeerr({ poll = 60_000 } = {}) {
  const [data, setData] = useState({ counts: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const counts = await getJson("/api/seerr/api/v1/request/count");
        if (!alive) return;
        setData({ counts, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── Pi-hole v6 — auth flow client-side (key is browser-visible). ─
const PIHOLE_KEY = import.meta.env.VITE_PIHOLE_KEY || "";
export function usePihole({ poll = 30_000 } = {}) {
  const [s, setS] = useState({ state: "loading", queries: null, blocked: null, pct: null, clients: null });
  useEffect(() => {
    let alive = true;
    let sid = null;
    const auth = async () => {
      if (!PIHOLE_KEY) return null;
      try {
        const r = await fetch("/api/pihole/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: PIHOLE_KEY }),
        });
        const j = await r.json();
        return j?.session?.sid || null;
      } catch { return null; }
    };
    const run = async () => {
      sid = sid || await auth();
      try {
        const r = await fetch("/api/pihole/api/stats/summary", {
          headers: sid ? { sid } : {},
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        if (j?.queries) {
          setS({
            state: "live",
            queries: j.queries.total,
            blocked: j.queries.blocked,
            pct: j.queries.percent_blocked,
            clients: j.clients?.active,
          });
        } else {
          setS(p => ({ ...p, state: "error" }));
        }
      } catch { if (alive) setS(p => ({ ...p, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return s;
}

// ─── Speedtest tracker v2 ──────────────────────────────────────
// API returns download/upload in bytes/sec — normalize to Mbps here so
// every consumer can render `${st.down} Mbps` without thinking.
function bpsToMbps(v) {
  if (v == null) return null;
  const n = +v;
  if (!Number.isFinite(n)) return null;
  // Heuristic: values > 1e5 are byte/s (raw). Already-Mbps values stay <= 10000.
  return n > 10000 ? +(n * 8 / 1e6).toFixed(1) : +n.toFixed(1);
}
export function useSpeedtest({ poll = 60_000 } = {}) {
  const [s, setS] = useState({ state: "loading", down: null, up: null, ping: null, when: null });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson("/api/speedtest/api/speedtest/latest");
        const d = j?.data || j;
        if (!alive) return;
        setS({
          state: "live",
          down: bpsToMbps(d.download ?? d.download_speed),
          up:   bpsToMbps(d.upload ?? d.upload_speed),
          ping: d.ping != null ? +(+d.ping).toFixed(1) : null,
          when: d.created_at || d.timestamp || null,
        });
      } catch { if (alive) setS(p => ({ ...p, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return s;
}

// ─── NextCloud usage (capabilities + user info) ────────────────
export function useNextcloud({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ info: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/nextcloud/ocs/v1.php/cloud/user?format=json", {
          headers: { "OCS-APIRequest": "true", Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        setData({ info: j?.ocs?.data ?? null, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── Audiobookshelf libraries ──────────────────────────────────
export function useAudiobookshelf({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ libraries: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson("/api/audiobookshelf/api/libraries");
        if (!alive) return;
        setData({ libraries: j?.libraries ?? [], state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── Homey Pro (cloud OAuth via server snapshot) ──────────────
// Calls /api/homey/snapshot which the homey-api SDK populates server
// side (zones + devices + flows + system pre-flattened to plain JSON).
// Maps to the Homey.jsx page shape: zones contain their devices and
// climate is derived from the first temp/humidity sensor in each zone.
export function useHomey({ poll = 30_000 } = {}) {
  const [data, setData] = useState({ state: "loading", system: null, zones: [], devices: [], flows: [], folders: [], variables: [] });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const snap = await getJson("/api/homey/snapshot");
        if (!alive) return;

        const byZone = {};
        for (const d of snap.devices || []) (byZone[d.zone] ||= []).push(d);

        const enrichedZones = (snap.zones || []).map(z => {
          const zd = (byZone[z.id] || []).map(d => {
            const v = d.values || {};
            return {
              id: d.id, name: d.name, type: devClass(d.class), raw: d.class,
              available: d.available,
              capabilities: d.capabilities || [],
              on: v.onoff,
              dim: v.dim != null ? Math.round(v.dim * 100) : null,
              power: v.measure_power,
              temp: v.measure_temperature,
              humidity: v.measure_humidity,
              battery: v.measure_battery,
              target: v.target_temperature,
              alarm_motion: v.alarm_motion,
              alarm_contact: v.alarm_contact,
              reading: deriveReading(v),
            };
          });
          const climateSrc = zd.find(d => d.temp != null);
          const humSrc = zd.find(d => d.humidity != null);
          return {
            id: z.id, name: z.name, parent: z.parent, active: z.active,
            temp: climateSrc?.temp ?? null,
            humidity: humSrc?.humidity ?? null,
            devices: zd,
          };
        });

        setData({
          state: "live",
          system: snap.system,
          zones: enrichedZones,
          devices: snap.devices || [],
          flows: (snap.flows || []).map(f => ({
            id: f.id, name: f.name, enabled: f.enabled, broken: f.broken,
            folder: f.folder ?? null,
            type: f.type,
            trigger: f.type === 'advancedflow' ? "advanced" : "—",
          })),
          folders: snap.folders || [],
          variables: snap.variables || [],
        });
      } catch (e) {
        console.warn("[homey]", e);
        if (alive) setData(d => ({ ...d, state: "error" }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, tick]);
  return { ...data, refresh };
}

export async function homeySetCapability(deviceId, capability, value) {
  const r = await fetch(`/api/homey/device/${encodeURIComponent(deviceId)}/capability/${encodeURIComponent(capability)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}

export async function homeySetVariable(id, value) {
  const r = await fetch(`/api/homey/variable/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}

export async function homeyTriggerFlow(flowId, type = "flow") {
  const r = await fetch(`/api/homey/flow/${encodeURIComponent(flowId)}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}

function devClass(c) {
  if (!c) return "other";
  if (c === "light") return "light";
  if (c === "socket") return "socket";
  if (c === "thermostat" || c === "heater") return "thermostat";
  if (c === "sensor" || c.endsWith?.("sensor")) return "sensor";
  if (c === "doorbell" || c === "lock" || c === "windowcoverings") return "door";
  if (c === "button" || c === "remote") return "sensor";
  if (c === "speaker" || c === "tv" || c === "amplifier") return "socket";
  return "other";
}

function deriveReading(v) {
  const parts = [];
  if (v.measure_temperature != null) parts.push(`${v.measure_temperature.toFixed(1)} °C`);
  if (v.measure_humidity != null)    parts.push(`${Math.round(v.measure_humidity)} %`);
  if (v.alarm_motion != null)        parts.push(v.alarm_motion ? "motion" : "clear");
  if (v.alarm_contact != null)       parts.push(v.alarm_contact ? "open" : "closed");
  if (v.measure_battery != null)     parts.push(`${Math.round(v.measure_battery)}% bat`);
  return parts.join(" · ") || null;
}

// ─── Arcane (docker manager) ───────────────────────────────────
// All endpoints under /api/environments/{id}/...; pulls envs first,
// then containers + projects + image/network/volume counts in parallel.
export function useArcane({ poll = 15_000 } = {}) {
  const [data, setData] = useState({ state: "loading", envs: [], containers: [], projects: [], counts: {} });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const envs = await getJson("/api/arcane/api/environments");
        const list = envs?.data ?? [];
        const main = list[0];
        if (!main) throw new Error("no environments");
        const base = `/api/arcane/api/environments/${main.id}`;
        const [containers, projects, images, networks, volumes] = await Promise.all([
          getJson(`${base}/containers?limit=500`).catch(() => null),
          getJson(`${base}/projects?limit=500`).catch(() => null),
          getJson(`${base}/images?limit=1`).catch(() => null),
          getJson(`${base}/networks?limit=1`).catch(() => null),
          getJson(`${base}/volumes?limit=1`).catch(() => null),
        ]);
        if (!alive) return;
        setData({
          state: "live",
          envs: list,
          envId: main.id,
          envName: main.name,
          envStatus: main.status,
          containers: containers?.data ?? [],
          projects: projects?.data ?? [],
          counts: {
            images: images?.pagination?.totalItems ?? null,
            networks: networks?.pagination?.totalItems ?? null,
            volumes: volumes?.pagination?.totalItems ?? null,
          },
        });
      } catch (e) {
        if (alive) setData(d => ({ ...d, state: "error" }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, tick]);
  return { ...data, refresh };
}

// Container/project actions — fire-and-forget POSTs against the Arcane proxy.
export async function arcaneAction(envId, kind, id, action) {
  const r = await fetch(`/api/arcane/api/environments/${envId}/${kind}/${id}/${action}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}

// ─── Service health ping (best-effort, no-cors HEAD) ───────────
export function useServiceHealth(services, intervalMs = 60_000) {
  const [map, setMap] = useState({});
  const key = services.map(s => s.id).join("|");
  useEffect(() => {
    let alive = true;
    const ping = async (s) => {
      try {
        await fetch(s.url, { mode: "no-cors", method: "HEAD", cache: "no-store", redirect: "follow" });
        return true;
      } catch { return false; }
    };
    const run = async () => {
      const out = {};
      await Promise.all(services.map(async (s) => { out[s.id] = await ping(s); }));
      if (alive) setMap(out);
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs]);
  return map;
}

// ─── Legacy compat for Home.jsx ────────────────────────────────
// Home page uses these older names — keep thin wrappers.
export function usePlexSessions() {
  const { sessions } = usePlex();
  return sessions?.size ?? null;
}

export function useArrQueue(svc) {
  const { queue } = useArr(svc);
  return queue?.totalRecords ?? null;
}

// ─── Tugtainer — pending container updates ────────────────────
// Requires `ENABLE_PUBLIC_API=true` on the Tugtainer container.
// Tries `/api/public/summary` first (richer payload), falls back to
// `/api/public/update_count`. Response shapes are version-tolerant.
export function useTugtainer({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ pending: null, total: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const pickNum = (...vals) => vals.find(v => typeof v === "number");
    const tryEndpoints = async () => {
      try {
        const j = await getJson("/api/tugtainer/api/public/summary");
        const pending = pickNum(j?.update_count, j?.updates, j?.pending, j?.updates_available);
        const total   = pickNum(j?.total, j?.containers_total, j?.count);
        if (typeof pending === "number") return { pending, total: total ?? null, state: "live" };
      } catch { /* fall through */ }
      try {
        const j = await getJson("/api/tugtainer/api/public/update_count");
        const pending = typeof j === "number" ? j : pickNum(j?.count, j?.update_count, j?.value);
        if (typeof pending === "number") return { pending, total: null, state: "live" };
      } catch { /* fall through */ }
      return { pending: null, total: null, state: "error" };
    };
    const run = async () => {
      const next = await tryEndpoints();
      if (alive) setData(next);
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── Tautulli — recently added (movies + episodes) ────────────
export function useRecentlyAdded({ count = 8, poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ items: [], state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson(`/api/tautulli/api/v2?cmd=get_recently_added&count=${count}`);
        const rows = j?.response?.data?.recently_added || [];
        const items = rows.map(r => {
          // Prefer the show poster for episodes (grandparent_rating_key) so
          // the strip reads as a wall of posters instead of episode stills.
          const posterKey = r.media_type === "episode"
            ? (r.grandparent_rating_key || r.parent_rating_key || r.rating_key)
            : r.rating_key;
          // Tautulli serves Plex art via api/v2 cmd=pms_image_proxy. The
          // Vite proxy appends `&apikey=…` server-side so the token never
          // reaches the browser.
          const thumb = posterKey
            ? `/api/tautulli/api/v2?cmd=pms_image_proxy&rating_key=${encodeURIComponent(posterKey)}&width=240&height=360&fallback=poster`
            : (r.thumb
                ? `/api/tautulli/api/v2?cmd=pms_image_proxy&img=${encodeURIComponent(r.thumb)}&width=240&height=360&fallback=poster`
                : null);
          return {
            key: r.rating_key || `${r.title}-${r.added_at}`,
            title: r.media_type === "episode"
              ? `${r.grandparent_title} · ${r.title}`
              : r.title,
            year: r.year,
            type: r.media_type,
            addedAt: r.added_at ? Number(r.added_at) * 1000 : null,
            thumb,
          };
        });
        if (alive) setData({ items, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [count, poll]);
  return data;
}

// ─── Calendar (iCloud CalDAV via /api/icloud/events) ──────────
// Server-side middleware (src/server/icloud.js) handles CalDAV
// discovery + REPORT and returns parsed JSON. State "idle" means
// the env (ICLOUD_USER / ICLOUD_APP_PASSWORD / ICLOUD_CALENDAR)
// is not configured.
export function useCalendar({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ events: [], state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/icloud/events");
        const j = await r.json();
        if (!alive) return;
        if (j.state !== "live") { setData({ events: [], state: j.state || "error" }); return; }
        const events = (j.events || []).map(e => ({
          ...e,
          start: new Date(e.start),
          end: e.end ? new Date(e.end) : null,
        }));
        setData({ events, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// ─── Reminders (iCloud VTODO via /api/icloud/todos) ───────────
// Open VTODOs from a single Reminders list. Read-only.
export function useReminders({ poll = 2 * 60_000 } = {}) {
  const [data, setData] = useState({ todos: [], openCount: 0, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/icloud/todos");
        const j = await r.json();
        if (!alive) return;
        if (j.state !== "live") { setData({ todos: [], openCount: 0, state: j.state || "error" }); return; }
        const todos = (j.todos || []).map(t => ({
          ...t,
          due: t.due ? new Date(t.due) : null,
        }));
        setData({ todos, openCount: todos.length, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}
