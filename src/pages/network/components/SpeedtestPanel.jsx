import { useState, useRef, useEffect } from 'react';
import { useSpeedtest, useSpeedtestHistory } from '../../../lib/hooks/speedtest.js';
import Sparkline from '../../../components/Sparkline.jsx';
import { fmtAgo, avg, maxOf } from '../utils.js';

const SPEEDTEST_URL = (import.meta.env.VITE_SPEEDTEST_URL || '').replace(/\/+$/, '');

function SpeedMetric({ label, value, unit, sub, series, color, seed }) {
  const fmt = (v) => (v == null ? '—' : (Math.abs(v) >= 100 ? Math.round(v) : (+v).toFixed(1)));
  return (
    <div className="speed-metric">
      <div className="speed-metric-head">
        <span className="speed-metric-label">{label}</span>
        {sub && <span className="speed-metric-sub">{sub}</span>}
      </div>
      <div className="speed-metric-value">
        {value == null ? <span className="dim">—</span> : <span>{fmt(value)}</span>}
        <span className="unit">{unit}</span>
      </div>
      <div className="speed-metric-spark">
        <Sparkline
          data={series}
          color={color}
          w={300} h={64}
          seed={seed}
          maxPoints={288}
          format={fmt}
          axisLabel="24h"
        />
      </div>
    </div>
  );
}

export default function SpeedtestPanel({ idx }) {
  const hist = useSpeedtestHistory({ limit: 48, poll: 5 * 60_000 });
  const latest = useSpeedtest();
  const histItems = hist.items || [];

  const [persisted, setPersisted] = useState({ down: [], up: [], ping: [], loss: [] });
  const [persistedState, setPersistedState] = useState('loading');
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const r = await fetch(`/api/metrics?since=${since}`);
        if (!r.ok) throw new Error('http ' + r.status);
        const data = await r.json();
        if (!alive) return;
        const tail = (s) => (data[s] || []).map(([, v]) => v);
        setPersisted({
          down: tail('speedtest.down'),
          up:   tail('speedtest.up'),
          ping: tail('speedtest.ping'),
          loss: tail('speedtest.loss'),
        });
        setPersistedState('live');
      } catch {
        if (alive) setPersistedState('error');
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const accumRef = useRef([]);
  const [, forceRerender] = useState(0);
  useEffect(() => {
    if (latest.state !== 'live') return;
    if (latest.down == null && latest.up == null) return;
    const cur = accumRef.current;
    const last = cur[cur.length - 1];
    const sig = `${latest.when || ''}|${latest.down}|${latest.up}|${latest.ping}`;
    const lastSig = last ? `${last.when || ''}|${last.down}|${last.up}|${last.ping}` : '';
    if (sig !== lastSig) {
      accumRef.current = [...cur, {
        down: latest.down, up: latest.up, ping: latest.ping, when: latest.when,
      }].slice(-288);
      forceRerender(x => x + 1);
    }
  }, [latest.down, latest.up, latest.ping, latest.when, latest.state]);

  const fromList = {
    down: histItems.map(x => x.down).filter(v => v != null),
    up:   histItems.map(x => x.up).filter(v => v != null),
    ping: histItems.map(x => x.ping).filter(v => v != null),
    loss: histItems.map(x => x.loss).filter(v => v != null),
  };
  const fromAccum = {
    down: accumRef.current.map(x => x.down).filter(v => v != null),
    up:   accumRef.current.map(x => x.up).filter(v => v != null),
    ping: accumRef.current.map(x => x.ping).filter(v => v != null),
    loss: [],
  };
  const liveLatest = (key) => {
    if (latest.state !== 'live') return null;
    if (key === 'down') return latest.down;
    if (key === 'up')   return latest.up;
    if (key === 'ping') return latest.ping;
    return null;
  };
  const pick = (key) => {
    const sources = [persisted[key], fromList[key], fromAccum[key]];
    let best = sources[0] || [];
    for (const s of sources) if ((s?.length || 0) > best.length) best = s;
    if (best && best.length) return best;
    const v = liveLatest(key);
    return v != null ? [v] : [];
  };

  const downSeries = pick('down');
  const upSeries   = pick('up');
  const pingSeries = pick('ping');

  const last = histItems[histItems.length - 1] || (latest.state === 'live' ? {
    down: latest.down, up: latest.up, ping: latest.ping, when: latest.when,
    server: null, isp: null, loss: null,
  } : null);

  const sampleCount = Math.max(persisted.down.length, histItems.length, accumRef.current.length);

  const downAvg = avg(downSeries);
  const upAvg = avg(upSeries);
  const pingAvg = avg(pingSeries);
  const downMax = maxOf(downSeries);
  const upMax = maxOf(upSeries);

  const loading = persistedState === 'loading' && hist.state === 'loading' && latest.state === 'loading';
  const errored = persistedState === 'error' && hist.state === 'error' && latest.state === 'error';
  const empty = !loading && !last && sampleCount === 0;

  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx).padStart(2, '0')}</span>
          <h2>speedtest</h2>
        </div>
        <span className="section-meta">
          {loading && 'loading…'}
          {errored && 'unreachable'}
          {!loading && !errored && (last || sampleCount > 0) && (
            <>
              {sampleCount} sample{sampleCount === 1 ? '' : 's'} · 24h
              {last?.when && <> · last {fmtAgo(last.when)}</>}
              {last?.server && <> · {last.server}</>}
            </>
          )}
        </span>
      </div>

      {empty && !errored && <p className="net-empty">No speedtest results yet.</p>}
      {errored && <p className="net-empty">Speedtest tracker unreachable. Check VITE_SPEEDTEST_URL / SPEEDTEST_API_KEY.</p>}

      {!errored && !empty && (
        <div className="speed-panel">
          <SpeedMetric
            label="download"
            value={last?.down ?? downSeries[downSeries.length - 1]}
            unit="Mbps"
            sub={downAvg != null ? `avg ${downAvg} · max ${downMax}` : null}
            series={downSeries}
            color="oklch(0.78 0.14 220)"
            seed={1}
          />
          <SpeedMetric
            label="upload"
            value={last?.up ?? upSeries[upSeries.length - 1]}
            unit="Mbps"
            sub={upAvg != null ? `avg ${upAvg} · max ${upMax}` : null}
            series={upSeries}
            color="oklch(0.78 0.14 150)"
            seed={2}
          />
          <SpeedMetric
            label="ping"
            value={last?.ping ?? pingSeries[pingSeries.length - 1]}
            unit="ms"
            sub={pingAvg != null ? `avg ${pingAvg}` : null}
            series={pingSeries}
            color="var(--ember)"
            seed={3}
          />
          <div className="speed-meta">
            {last?.isp && <div><span className="k">isp</span><span className="v">{last.isp}</span></div>}
            {last?.server && <div><span className="k">server</span><span className="v">{last.server}</span></div>}
            {last?.loss != null && <div><span className="k">loss</span><span className="v">{last.loss}%</span></div>}
            {SPEEDTEST_URL && (
              <a className="speed-open" href={SPEEDTEST_URL} target="_blank" rel="noreferrer">open tracker →</a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
