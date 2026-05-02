import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

/* Homey Pro (cloud OAuth via server snapshot).
 *
 * Calls /api/homey/snapshot which the homey-api SDK populates server
 * side (zones + devices + flows + system pre-flattened to plain JSON).
 * Maps to the Homey.jsx page shape: zones contain their devices and
 * climate is derived from the first temp/humidity sensor in each zone. */
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
