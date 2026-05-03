import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

/* Homey Pro (cloud OAuth via server snapshot).
 *
 * Calls /api/homey/snapshot which the homey-api SDK populates server
 * side (zones + devices + flows + system pre-flattened to plain JSON).
 * Maps to the Homey.jsx page shape: zones contain their devices and
 * climate is derived from the first temp/humidity sensor in each zone. */

const EMPTY = { system: null, zones: [], devices: [], flows: [], folders: [], variables: [] };

function shapeSnapshot(snap) {
  const byZone = {};
  for (const d of snap.devices || []) (byZone[d.zone] ||= []).push(d);

  const zones = (snap.zones || []).map((z) => {
    const zd = (byZone[z.id] || []).map(shapeDevice);
    const climateSrc = zd.find((d) => d.temp != null);
    const humSrc = zd.find((d) => d.humidity != null);
    return {
      id: z.id, name: z.name, parent: z.parent, active: z.active,
      temp: climateSrc?.temp ?? null,
      humidity: humSrc?.humidity ?? null,
      devices: zd,
    };
  });

  return {
    system: snap.system,
    zones,
    devices: snap.devices || [],
    flows: (snap.flows || []).map((f) => ({
      id: f.id, name: f.name, enabled: f.enabled, broken: f.broken,
      folder: f.folder ?? null,
      type: f.type,
      trigger: f.type === 'advancedflow' ? 'advanced' : '—',
    })),
    folders: snap.folders || [],
    variables: snap.variables || [],
  };
}

function shapeDevice(d) {
  const v = d.values || {};
  return {
    id: d.id, name: d.name, type: devClass(d.class), raw: d.class,
    available: d.available,
    capabilities: d.capabilities || [],
    on: v.onoff,
    dim: v.dim != null ? Math.round(v.dim * 100) : null,
    power: v.measure_power,
    meter: v.meter_power,
    temp: v.measure_temperature,
    humidity: v.measure_humidity,
    battery: v.measure_battery,
    target: v.target_temperature,
    alarm_motion: v.alarm_motion,
    alarm_contact: v.alarm_contact,
    reading: deriveReading(v),
  };
}

export function useHomey({ poll = 30_000 } = {}) {
  const { data, state, refresh } = usePolling(
    async (signal) => shapeSnapshot(await getJson('/api/homey/snapshot', { signal })),
    { poll, cacheKey: 'homey'}
  );
  return { state, ...(data || EMPTY), refresh };
}

export async function homeySetCapability(deviceId, capability, value) {
  return postJson(`/api/homey/device/${encodeURIComponent(deviceId)}/capability/${encodeURIComponent(capability)}`, { value });
}

export async function homeySetVariable(id, value) {
  return postJson(`/api/homey/variable/${encodeURIComponent(id)}`, { value });
}

export async function homeyTriggerFlow(flowId, type = 'flow') {
  return postJson(`/api/homey/flow/${encodeURIComponent(flowId)}/trigger`, { type });
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}

export function devClass(c) {
  if (!c) return 'other';
  if (c === 'light') return 'light';
  if (c === 'socket') return 'socket';
  if (c === 'thermostat' || c === 'heater') return 'thermostat';
  if (c === 'sensor' || c.endsWith?.('sensor')) return 'sensor';
  if (c === 'doorbell' || c === 'lock' || c === 'windowcoverings') return 'door';
  if (c === 'button' || c === 'remote') return 'sensor';
  if (c === 'speaker' || c === 'tv' || c === 'amplifier') return 'socket';
  return 'other';
}

export function deriveReading(v) {
  const parts = [];
  if (v.measure_temperature != null) parts.push(`${v.measure_temperature.toFixed(1)} °C`);
  if (v.measure_humidity != null)    parts.push(`${Math.round(v.measure_humidity)} %`);
  if (v.alarm_motion != null)        parts.push(v.alarm_motion ? 'motion' : 'clear');
  if (v.alarm_contact != null)       parts.push(v.alarm_contact ? 'open' : 'closed');
  if (v.measure_battery != null)     parts.push(`${Math.round(v.measure_battery)}% bat`);
  return parts.join(' · ') || null;
}
