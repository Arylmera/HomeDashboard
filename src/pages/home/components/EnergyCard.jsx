/* ============================================================== *
 *  EnergyCard — household power summary from Homey snapshot.
 *
 *  Sums `measure_power` (W, instantaneous) across all devices that
 *  report it, then extrapolates a daily/monthly cost at the local
 *  tariff. Cost is "if usage stayed at the current rate", not a
 *  measured day total — Homey doesn't expose insights here.
 *
 *  Tariff defaults to 0.13 €/kWh; override with
 *  `VITE_ENERGY_EUR_PER_KWH` at build time.
 * ============================================================== */
import { useMemo } from 'react';
import { useHomey } from '../../../lib/hooks.js';

const EUR_PER_KWH = Number(import.meta.env.VITE_ENERGY_EUR_PER_KWH) || 0.13;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;

function fmtW(w) {
  if (w == null || !isFinite(w)) return "—";
  if (w >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${Math.round(w)} W`;
}

function fmtEur(v) {
  if (v == null || !isFinite(v)) return "—";
  if (v >= 100) return `${v.toFixed(0)}`;
  if (v >= 10)  return `${v.toFixed(1)}`;
  return v.toFixed(2);
}

function dayCost(w) {
  return (w * HOURS_PER_DAY / 1000) * EUR_PER_KWH;
}

export default function EnergyCard() {
  const { devices, state } = useHomey({ poll: 30_000 });

  const { totalW, perDay, perMonth, top, meterCount } = useMemo(() => {
    let totalW = 0, anyW = false;
    const consumers = [];
    for (const d of devices || []) {
      const p = d.values?.measure_power;
      if (typeof p === 'number') {
        totalW += p; anyW = true;
        if (p > 0.5) consumers.push({ name: d.name, w: p });
      }
    }
    consumers.sort((a, b) => b.w - a.w);
    const day = anyW ? dayCost(totalW) : null;
    return {
      totalW: anyW ? totalW : null,
      perDay: day,
      perMonth: day != null ? day * DAYS_PER_MONTH : null,
      top: consumers.slice(0, 3),
      meterCount: (devices || []).filter(d => d.values?.measure_power != null).length,
    };
  }, [devices]);

  return (
    <div className="panel energy-panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// energy</span>Energy</div>
        <div className="panel-meta">
          {state === "loading" && <span>—</span>}
          {state === "error"   && <span className="meta-err">offline</span>}
          {state === "live"    && <span>{meterCount} meters · {EUR_PER_KWH.toFixed(2)} €/kWh</span>}
        </div>
      </div>

      <div className="energy-stats">
        <div className="energy-stat">
          <div className="val">{fmtW(totalW)}</div>
          <div className="lab">now</div>
        </div>
        <div className="energy-stat" title="Estimated cost if today stayed at the current draw.">
          <div className="val">{fmtEur(perDay)}<span className="unit"> €/d</span></div>
          <div className="lab">today (est.)</div>
        </div>
        <div className="energy-stat" title="Estimated monthly cost at the current draw (× 30 days).">
          <div className="val">{fmtEur(perMonth)}<span className="unit"> €/m</span></div>
          <div className="lab">month (est.)</div>
        </div>
      </div>

      {top.length > 0 && (
        <ul className="energy-top">
          {top.map(t => (
            <li key={t.name}>
              <span className="energy-name">{t.name}</span>
              <span className="energy-val">{fmtW(t.w)} · {fmtEur(dayCost(t.w))} €/d</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
