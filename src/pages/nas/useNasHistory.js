import { useEffect, useRef, useState } from 'react';
import { HISTORY_MAX } from './utils.js';

/* ============================================================== *
 *  useNasHistory — ring buffers for CPU temps, memory, network.
 *  Seeds from /api/metrics on mount, then appends live samples
 *  every ~5 seconds.
 * ============================================================== */
export default function useNasHistory({ cores, memUsed, netRx, netTx }) {
  const [tempHistory, setTempHistory] = useState({});
  const [usageHistory, setUsageHistory] = useState({});
  const [avgTempHistory, setAvgTempHistory] = useState([]);
  const [memHistory, setMemHistory] = useState([]);
  const [rxHistory, setRxHistory] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const lastTempStampRef = useRef(0);
  const lastSysStampRef = useRef(0);

  // Seed all buffers from server-persisted samples.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/metrics');
        if (!r.ok) return;
        const data = await r.json();
        if (!alive) return;
        const tail = (s) => (data[s] || []).slice(-HISTORY_MAX).map(([, v]) => v);
        const mem = tail('mem.used'), rx = tail('net.rx'), tx = tail('net.tx');
        const avg = tail('cpu.temp.avg');
        if (mem.length) setMemHistory(mem);
        if (rx.length)  setRxHistory(rx);
        if (tx.length)  setTxHistory(tx);
        if (avg.length) setAvgTempHistory(avg);
        const perCore = {};
        for (const k of Object.keys(data)) {
          const m = k.match(/^cpu\.temp\.(\d+)$/);
          if (m) perCore[+m[1]] = tail(k);
        }
        if (Object.keys(perCore).length) setTempHistory(perCore);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // Live tick — per-core temps + average.
  useEffect(() => {
    if (!cores.length) return;
    const now = Date.now();
    if (now - lastTempStampRef.current < 5000) return;
    const temps = cores.map(c => c.temp).filter(t => t != null);
    if (!temps.length) return;
    lastTempStampRef.current = now;
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    setTempHistory(prev => {
      const next = { ...prev };
      cores.forEach(c => {
        if (c.temp == null) return;
        const arr = next[c.i] ? next[c.i].slice() : [];
        arr.push(c.temp);
        if (arr.length > HISTORY_MAX) arr.shift();
        next[c.i] = arr;
      });
      return next;
    });
    setAvgTempHistory(prev => {
      const arr = prev.slice();
      arr.push(avg);
      if (arr.length > HISTORY_MAX) arr.shift();
      return arr;
    });
    setUsageHistory(prev => {
      const next = { ...prev };
      cores.forEach(c => {
        if (c.usage == null) return;
        const arr = next[c.i] ? next[c.i].slice() : [];
        arr.push(c.usage);
        if (arr.length > HISTORY_MAX) arr.shift();
        next[c.i] = arr;
      });
      return next;
    });
  }, [cores]);

  // Live tick — memory + network.
  useEffect(() => {
    const now = Date.now();
    if (now - lastSysStampRef.current < 5000) return;
    if (memUsed == null && netRx == null && netTx == null) return;
    lastSysStampRef.current = now;
    const push = (setter, v) => setter(prev => {
      const arr = prev.slice(); arr.push(v);
      if (arr.length > HISTORY_MAX) arr.shift();
      return arr;
    });
    if (memUsed != null) push(setMemHistory, memUsed);
    if (netRx != null) push(setRxHistory, netRx);
    if (netTx != null) push(setTxHistory, netTx);
  }, [memUsed, netRx, netTx]);

  return { tempHistory, usageHistory, avgTempHistory, memHistory, rxHistory, txHistory };
}
