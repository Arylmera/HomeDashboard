import { useMemo } from 'react';
import {
  useHomey, useSpeedtest, useNextcloud,
  homeySetCapability, homeyTriggerFlow, homeySetVariable,
} from '../../lib/hooks.js';
import { isHiddenZone } from './icons.jsx';

/* ============================================================== *
 *  useHomeyData — wires data sources, derives zones/flows/vars,
 *  computes summary stats, and exposes the action handlers used
 *  by ZoneCard / FlowGroup / VariableCard.
 * ============================================================== */
export default function useHomeyData() {
  const st = useSpeedtest();
  const nc = useNextcloud();
  const homey = useHomey();

  const isLive = homey.state === 'live' && homey.zones.length > 0;

  const zones = useMemo(() => isLive
    ? homey.zones.filter(z => !isHiddenZone(z.name))
    : [], [isLive, homey.zones]);
  const flows = isLive ? homey.flows : [];
  const folders = isLive ? (homey.folders || []) : [];
  const variables = useMemo(() => {
    const list = isLive ? (homey.variables || []) : [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [isLive, homey.variables]);

  const flowGroups = useMemo(() => {
    const folderName = (id) => folders.find(f => f.id === id)?.name || null;
    const map = new Map();
    for (const f of flows) {
      const key = f.folder || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return [...map.entries()]
      .map(([key, list]) => ({
        id: key,
        name: key === '__none__' ? 'Uncategorized' : (folderName(key) || 'Unknown folder'),
        flows: list,
      }))
      .sort((a, b) => {
        if (a.id === '__none__') return 1;
        if (b.id === '__none__') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [flows, folders]);

  const stats = useMemo(() => {
    const lightsOn = zones.reduce((s, z) => s + z.devices.filter(d => d.type === 'light' && d.on).length, 0);
    const totalDevs = zones.reduce((s, z) => s + z.devices.length, 0);
    const totalPower = zones.reduce((s, z) => s + z.devices.reduce((x, d) => x + (d.power || 0), 0), 0);
    const tempZones = zones.filter(z => z.temp != null);
    const avgTemp = tempZones.length ? (tempZones.reduce((s, z) => s + z.temp, 0) / tempZones.length).toFixed(1) : '—';
    const humZones = zones.filter(z => z.humidity != null);
    const avgHum = humZones.length ? Math.round(humZones.reduce((s, z) => s + z.humidity, 0) / humZones.length) : '—';
    const flowsOn = flows.filter(f => f.enabled).length;
    return { lightsOn, totalDevs, totalPower, avgTemp, avgHum, flowsOn };
  }, [zones, flows]);

  const onDeviceToggle = async (device) => {
    try {
      await homeySetCapability(device.id, 'onoff', !device.on);
      homey.refresh();
    } catch (e) { console.warn('[homey toggle]', e); }
  };
  const onFlowTrigger = async (flow) => {
    try {
      await homeyTriggerFlow(flow.id, flow.type);
    } catch (e) { console.warn('[homey trigger]', e); throw e; }
  };
  const onVariableSave = async (id, value) => {
    try {
      await homeySetVariable(id, value);
      homey.refresh();
    } catch (e) { console.warn('[homey variable]', e); throw e; }
  };

  return {
    homey, st, nc, isLive,
    zones, flows, variables, flowGroups, stats,
    onDeviceToggle, onFlowTrigger, onVariableSave,
  };
}
